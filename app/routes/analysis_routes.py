import os
import pandas as pd
from flask import Blueprint, current_app, flash, redirect, request, jsonify, send_file, session, url_for
from werkzeug.utils import secure_filename
from app.services.sentiment_analysis import predict_sentiments, extract_hashtags, extract_topics
from app.services.sentiment_analysis import analyze_sentiment_per_hashtag, get_top_users, extract_words_by_sentiment
from app.services.visualization import create_sentiment_plot, create_improved_word_cloud
from datetime import datetime
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.lib.units import inch, cm
from reportlab.platypus import PageBreak
from reportlab.platypus.flowables import HRFlowable
from reportlab.graphics.charts.barcharts import VerticalBarChart

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/upload', methods=['POST'])
def upload_file():
    # Verifikasi model terlatih ada
    if not os.path.exists(current_app.config['MODEL_PATH']):
        return jsonify({'error': f'Model terlatih tidak ditemukan: {current_app.config["MODEL_PATH"]}. Mohon pindahkan model Anda ke folder models/'})
    
    if 'csv-file' not in request.files:
        return jsonify({'error': 'No file part'})
    
    file = request.files['csv-file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'})
    
    if file:
        filename = secure_filename(file.filename)
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        try:
            # Simpan hasil analisis ke file
            output_file = os.path.join(current_app.config['UPLOAD_FOLDER'], f'analyzed_{filename}')
            
            # Proses file dan lakukan analisis sentimen
            result_df = predict_sentiments(file_path)
            
            # Simpan hasil analisis untuk penggunaan selanjutnya
            result_df.to_csv(output_file, index=False)
            
            # Simpan ONLY THE PATH to the analysis file in session, not the entire results
            session['analysis_file'] = output_file
            
            # Hitung statistik
            sentiment_counts = result_df['predicted_sentiment'].value_counts()
            total_tweets = len(result_df)
            
            # Ekstrak hashtags
            hashtag_counts = extract_hashtags(result_df)
            
            # Ekstrak topik
            topics = extract_topics(result_df)
            
            # Analisis sentimen per hashtag
            hashtag_sentiment = analyze_sentiment_per_hashtag(result_df)
            
            # Dapatkan pengguna teratas
            top_users = get_top_users(result_df)
            
            # Try to extract words by sentiment with improved function
            try:
                sentiment_words = extract_words_by_sentiment(result_df)
            except Exception as e:
                print(f"Error in sentiment word extraction: {e}")
                sentiment_words = {
                    'positive': [],
                    'neutral': [],
                    'negative': []
                }
            
            # Create plots with updated color scheme
            sentiment_plot = create_sentiment_plot(result_df)
            
            # Create improved word cloud with new function
            try:
                word_cloud = create_improved_word_cloud(result_df)
            except Exception as e:
                print(f"Error creating word cloud: {e}")
                word_cloud = None
            
            # Siapkan data untuk tampilan
            positive_count = int(sentiment_counts.get('Positif', 0))
            neutral_count = int(sentiment_counts.get('Netral', 0))
            negative_count = int(sentiment_counts.get('Negatif', 0))
            
            title = request.form.get('title', 'Analisis Sentimen X')
            description = request.form.get('description', '')
            
            # Create analysis results with error checking for all components
            analysis_results = {
                'title': title,
                'description': description,
                'total_tweets': total_tweets,
                'positive_count': positive_count,
                'neutral_count': neutral_count,
                'negative_count': negative_count,
                'positive_percent': round((positive_count / total_tweets * 100), 1) if total_tweets > 0 else 0,
                'neutral_percent': round((neutral_count / total_tweets * 100), 1) if total_tweets > 0 else 0,
                'negative_percent': round((negative_count / total_tweets * 100), 1) if total_tweets > 0 else 0,
                'top_hashtags': [{'tag': tag, 'count': count} for tag, count in hashtag_counts.most_common(10)],
                'topics': topics,
                'hashtag_sentiment': hashtag_sentiment,
                'top_users': top_users,
                'sentiment_words': {
                    'positive': sentiment_words.get('positive', []),
                    'neutral': sentiment_words.get('neutral', []),
                    'negative': sentiment_words.get('negative', [])
                },
                'sentiment_plot': sentiment_plot,
                'word_cloud': word_cloud if word_cloud else None
            }
            
            # Add necessary fields to tweets that we'll send directly to the client
            tweets_for_display = []
            for _, row in result_df.iterrows():
                tweet = {
                    'username': row.get('username', ''),
                    'content': row.get('content', ''),
                    'date': row.get('date', ''),
                    'likes': row.get('likes', 0),
                    'retweets': row.get('retweets', 0),
                    'replies': row.get('replies', 0),
                    'predicted_sentiment': row.get('predicted_sentiment', ''),
                    'confidence': row.get('confidence', 0)
                }
                
                # Add optional fields if they exist
                for field in ['tweet_url', 'image_url', 'lang', 'location']:
                    if field in row and not pd.isna(row[field]):
                        tweet[field] = row[field]
                
                tweets_for_display.append(tweet)
            
            # Add tweets to the results
            analysis_results['tweets'] = tweets_for_display
            
            # Store minimal context for chatbot in session, not the entire results
            session['analysis_context'] = {
                'title': title,
                'description': description,
                'total_tweets': total_tweets,
                'positive_count': positive_count,
                'neutral_count': neutral_count, 
                'negative_count': negative_count,
                'positive_percent': analysis_results['positive_percent'],
                'neutral_percent': analysis_results['neutral_percent'],
                'negative_percent': analysis_results['negative_percent'],
                'top_hashtags': [h['tag'] for h in analysis_results['top_hashtags'][:5]],
                'top_topics': [t['topic'] for t in topics[:5]]
            }
            
            return jsonify(analysis_results)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e)})

@analysis_bp.route('/filter_tweets', methods=['POST'])
def filter_tweets():
    data = request.json
    sentiment_filter = data.get('sentiment', 'all')
    
    # Get the analysis file path from session
    file_path = session.get('analysis_file')
    if not file_path or not os.path.exists(file_path):
        return jsonify({'error': 'No analysis data available'})
    
    # Read the analysis results from file
    result_df = pd.read_csv(file_path)
    
    # Filter by sentiment
    if sentiment_filter != 'all':
        result_df = result_df[result_df['predicted_sentiment'] == sentiment_filter]
    
    # Prepare tweets for display
    tweets_for_display = []
    for _, row in result_df.iterrows():
        tweet = {
            'username': row.get('username', ''),
            'content': row.get('content', ''),
            'date': row.get('date', ''),
            'likes': row.get('likes', 0),
            'retweets': row.get('retweets', 0),
            'replies': row.get('replies', 0),
            'predicted_sentiment': row.get('predicted_sentiment', ''),
            'confidence': row.get('confidence', 0)
        }
        
        # Add optional fields if they exist
        for field in ['tweet_url', 'image_url', 'lang', 'location']:
            if field in row and not pd.isna(row[field]):
                tweet[field] = row[field]
        
        tweets_for_display.append(tweet)
    
    return jsonify({'tweets': tweets_for_display})

@analysis_bp.route('/download_report', methods=['GET'])
def download_report():
    # Cek apakah ada data analisis di session
    if 'analysis_file' not in session or 'analysis_context' not in session:
        flash("Tidak ada data analisis yang tersedia. Silakan upload file CSV terlebih dahulu.", "warning")
        return redirect(url_for('main.index'))
    
    # Ambil data analisis dari file
    file_path = session.get('analysis_file')
    if not os.path.exists(file_path):
        flash("File analisis tidak ditemukan.", "error")
        return redirect(url_for('main.index'))
    
    # Baca data analisis
    analysis_df = pd.read_csv(file_path)
    
    # Ambil konteks analisis dari session
    analysis_context = session.get('analysis_context')
    
    # Siapkan buffer untuk PDF
    buffer = BytesIO()
    
    # Buat dokumen PDF
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           rightMargin=50, leftMargin=50,
                           topMargin=50, bottomMargin=50)
    styles = getSampleStyleSheet()
    elements = []
    
    # ============= DEFINISI STYLE =============
    
    # Warna
    primary_color = colors.HexColor('#1b3a59')     # Biru tua
    secondary_color = colors.HexColor('#2d6b9c')   # Biru sedang
    accent_color = colors.HexColor('#f1b211')      # Kuning emas
    light_color = colors.HexColor('#e6e6e6')       # Abu muda
    
    # Definisi style halaman
    def add_page_number(canvas, doc):
        page_num = canvas.getPageNumber()
        canvas.saveState()
        canvas.setFont('Helvetica', 9)
        canvas.setFillColor(colors.darkgrey)
        canvas.drawRightString(doc.pagesize[0] - 50, 30, f"Halaman {page_num}")
        canvas.drawString(50, 30, f"Laporan Analisis Sentimen • {datetime.now().strftime('%d-%m-%Y')}")
        canvas.restoreState()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=22,
        alignment=1,  # Center alignment
        spaceAfter=12,
        textColor=primary_color,
        fontName='Helvetica-Bold'
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Heading2'],
        fontSize=16,
        alignment=1,
        spaceAfter=20,
        textColor=secondary_color
    )
    
    heading1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=primary_color,
        spaceBefore=16,
        spaceAfter=10,
        underline=1,
        leftIndent=0
    )
    
    heading2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=secondary_color,
        spaceBefore=12,
        spaceAfter=8,
        leftIndent=0
    )
    
    heading3_style = ParagraphStyle(
        'Heading3',
        parent=styles['Heading3'],
        fontSize=12,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=6,
        leftIndent=10
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=11,
        spaceAfter=8,
        textColor=colors.black,
        leading=14,  # line spacing
        leftIndent=0
    )
    
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=normal_style,
        leftIndent=15,
        bulletIndent=0,
        bulletText='•'
    )
    
    # Fungsi untuk membuat horizontal line
    def horizontal_line():
        line = HRFlowable(
            width="100%",
            thickness=1,
            color=secondary_color,
            spaceBefore=5,
            spaceAfter=10
        )
        elements.append(line)
    
    # ============= HALAMAN SAMPUL =============
    elements.append(Spacer(1, 1*inch))
    elements.append(Paragraph("LAPORAN ANALISIS SENTIMEN", title_style))
    elements.append(Paragraph("Platform X (Twitter)", subtitle_style))
    elements.append(Spacer(1, 0.5*inch))
    
    # Dua garis pembatas
    horizontal_line()
    elements.append(Spacer(1, 0.2*inch))
    
    # Judul Analisis
    elements.append(Paragraph(f"<b>Topik:</b> {analysis_context['title']}", heading1_style))
    elements.append(Spacer(1, 0.5*inch))
    
    # Metadata dan statistik utama
    date_text = f"<b>Tanggal Pembuatan:</b> {datetime.now().strftime('%d %B %Y')}"
    time_text = f"<b>Waktu:</b> {datetime.now().strftime('%H:%M')}"
    total_text = f"<b>Total Data:</b> {analysis_context['total_tweets']} tweets"
    period_text = f"<b>Periode Analisis:</b> {datetime.now().strftime('%B %Y')}"
    
    elements.append(Paragraph(date_text, normal_style))
    elements.append(Paragraph(time_text, normal_style))
    elements.append(Paragraph(total_text, normal_style))
    elements.append(Paragraph(period_text, normal_style))
    
    elements.append(Spacer(1, 0.5*inch))
    horizontal_line()
    
    # Statistik sentimen halaman depan
    pos_percent = analysis_context['positive_percent']
    neu_percent = analysis_context['neutral_percent']
    neg_percent = analysis_context['negative_percent']
    
    dominant = "Positif" if pos_percent >= max(neu_percent, neg_percent) else \
               "Netral" if neu_percent >= max(pos_percent, neg_percent) else "Negatif"
    
    sentiment_summary = f"""
    <b>Ringkasan Sentimen:</b><br/>
    • <font color="green">Positif</font>: {pos_percent}%<br/>
    • <font color="blue">Netral</font>: {neu_percent}%<br/> 
    • <font color="red">Negatif</font>: {neg_percent}%<br/><br/>
    <b>Sentimen Dominan:</b> {dominant}
    """
    
    elements.append(Paragraph(sentiment_summary, normal_style))
    elements.append(Spacer(1, 1*inch))
    
    # Watermark
    elements.append(Paragraph(
        "Dihasilkan oleh Aplikasi Analisis Sentimen X",
        ParagraphStyle(
            'Watermark',
            parent=normal_style,
            alignment=1,
            textColor=colors.gray,
            fontSize=10
        )
    ))
    
    # Page break
    elements.append(PageBreak())
    
    # ============= DAFTAR ISI =============
    elements.append(Paragraph("DAFTAR ISI", heading1_style))
    horizontal_line()
    
    toc_items = [
        "<b>1. Ringkasan Eksekutif</b>",
        "<b>2. Analisis Sentimen</b>",
        "   2.1 Distribusi Sentimen",
        "   2.2 Visualisasi Sentimen",
        "<b>3. Topik dan Hashtag Utama</b>",
        "   3.1 Topik Utama",
        "   3.2 Hashtag Populer",
        "<b>4. Sampel Tweet</b>",
        "   4.1 Tweet Positif",
        "   4.2 Tweet Netral",
        "   4.3 Tweet Negatif",
        "<b>5. Kesimpulan dan Rekomendasi</b>",
        "   5.1 Kesimpulan",
        "   5.2 Rekomendasi",
        "   5.3 Metodologi Analisis",
    ]
    
    for item in toc_items:
        elements.append(Paragraph(item, normal_style))
        elements.append(Spacer(1, 5))
    
    elements.append(Spacer(1, 0.5*inch))
    elements.append(PageBreak())
    
    # ============= RINGKASAN EKSEKUTIF =============
    elements.append(Paragraph("1. RINGKASAN EKSEKUTIF", heading1_style))
    horizontal_line()
    
    executive_summary = f"""
    Laporan ini menyajikan hasil analisis sentimen terhadap {analysis_context['total_tweets']} tweets 
    yang terkait dengan "{analysis_context['title']}" pada platform X (Twitter). Data dianalisis 
    menggunakan model pembelajaran mesin (machine learning) berbasis IndoBERT yang terlatih 
    untuk mengklasifikasikan sentimen ke dalam tiga kategori: Positif, Netral, dan Negatif.
    """
    elements.append(Paragraph(executive_summary, normal_style))
    
    elements.append(Paragraph("Temuan Utama:", heading3_style))
    
    findings_text = f"""
    • Dari total {analysis_context['total_tweets']} tweets yang dianalisis, <b>{pos_percent}%</b> memiliki 
      sentimen positif, <b>{neu_percent}%</b> netral, dan <b>{neg_percent}%</b> negatif.<br/><br/>
      
    • Sentimen <b>{dominant}</b> mendominasi percakapan tentang topik ini, 
      menunjukkan bahwa publik secara umum memiliki pandangan {'positif' if dominant == 'Positif' else
      'netral' if dominant == 'Netral' else 'negatif'} terhadap "{analysis_context['title']}".<br/><br/>
      
    • Topik-topik utama yang sering dibicarakan meliputi: {', '.join(analysis_context['top_topics'][:3])}.<br/><br/>
    
    • Hashtag populer yang sering digunakan dalam tweets meliputi: {', '.join(analysis_context['top_hashtags'][:3])}.<br/><br/>
    """
    elements.append(Paragraph(findings_text, normal_style))
    
    # Insight tambahan berdasarkan sentimen dominan
    insight_text = {
        "Positif": f"""
        <b>Insight Utama:</b> Dominasi sentimen positif ({pos_percent}%) menunjukkan adanya 
        penerimaan dan dukungan publik yang baik terhadap topik ini. Penting untuk mempertahankan 
        momentum positif ini dengan terus mengkomunikasikan aspek-aspek yang mendapatkan respons baik.<br/><br/>
        """,
        
        "Netral": f"""
        <b>Insight Utama:</b> Dominasi sentimen netral ({neu_percent}%) menunjukkan bahwa banyak 
        percakapan bersifat informatif atau faktual tanpa menunjukkan emosi kuat. Ini menandakan perlu 
        upaya lebih untuk menggeser sentimen ke arah positif dengan mengkomunikasikan nilai dan manfaat.<br/><br/>
        """,
        
        "Negatif": f"""
        <b>Insight Utama:</b> Dominasi sentimen negatif ({neg_percent}%) menunjukkan adanya 
        kekhawatiran atau ketidakpuasan publik terhadap topik ini. Penting untuk mengidentifikasi 
        sumber masalah utama dan memberikan klarifikasi serta solusi untuk memperbaiki persepsi.<br/><br/>
        """
    }
    
    elements.append(Paragraph(insight_text[dominant], normal_style))
    elements.append(Spacer(1, 0.3*inch))
    elements.append(PageBreak())
    
    # ============= ANALISIS SENTIMEN =============
    elements.append(Paragraph("2. ANALISIS SENTIMEN", heading1_style))
    horizontal_line()
    
    # Distribusi Sentimen
    elements.append(Paragraph("2.1 Distribusi Sentimen", heading2_style))
    
    sentiment_table_content = f"""
    <b>Total Tweets Dianalisis:</b> {analysis_context['total_tweets']}<br/><br/>
    <font color="green"><b>Tweet Positif:</b> {analysis_context['positive_count']} ({pos_percent}%)</font><br/>
    <font color="blue"><b>Tweet Netral:</b> {analysis_context['neutral_count']} ({neu_percent}%)</font><br/>
    <font color="red"><b>Tweet Negatif:</b> {analysis_context['negative_count']} ({neg_percent}%)</font>
    """
    
    elements.append(Paragraph(sentiment_table_content, 
        ParagraphStyle('BoxedContent', 
                      parent=normal_style,
                      backColor=light_color,
                      borderColor=secondary_color,
                      borderWidth=1,
                      borderPadding=10,
                      borderRadius=5,
                      spaceBefore=10,
                      spaceAfter=10)))
    
    # Build PDF with page numbers
    doc.build(elements, onFirstPage=add_page_number, onLaterPages=add_page_number)
    buffer.seek(0)
    
    # Return file
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"Laporan_Analisis_Sentimen_{analysis_context['title'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf",
        mimetype='application/pdf'
    )