document.addEventListener('DOMContentLoaded', function() {
    // Form submission handling
    const analysisForm = document.getElementById('analysis-form');
    const submitBtn = document.getElementById('submit-btn');
    const loadingIndicator = document.getElementById('loading');
    
    // Main tab navigation
    const navLinks = document.querySelectorAll('.nav-tabs-link');
    const mainTabContent = document.querySelectorAll('.main-tab-content');
    
    // Chatbot elements
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');
    const chatbotMessages = document.getElementById('chatbot-messages');
    const chatbotTopicButtons = document.getElementById('chatbot-topic-buttons');
    
    // Sentiment filter, search and pagination
    const sentimentFilter = document.getElementById('sentiment-filter');
    const tweetSearch = document.getElementById('tweet-search');
    const itemsPerPage = document.getElementById('items-per-page');
    const paginationContainer = document.getElementById('pagination-container');

    const downloadReportBtn = document.getElementById('download-report-btn');
    if (downloadReportBtn) {
        downloadReportBtn.addEventListener('click', function(e) {
            // Cek apakah sudah ada analisis yang dilakukan
            if (!analysisResults) {
                e.preventDefault();
                showAlert('Silakan upload dan analisis data terlebih dahulu sebelum mengunduh laporan.', 'warning');
            } else {
                // Tambahkan loading state selama proses download
                this.innerHTML = `
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    Menyiapkan Laporan...
                `;
                
                // Kembalikan tampilan semula setelah beberapa saat
                setTimeout(() => {
                    this.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Unduh Report
                    `;
                }, 3000);
            }
        });
    }
    
    // Global variables
    let allTweets = [];
    let currentPage = 1;
    let tweetsPerPage = 10;
    let filteredTweets = [];
    let searchQuery = '';
    let analysisResults = null;
    
    // Chart instances to allow for updates
    let sentimentByHashtagChart = null;
    let sentimentByLocationChart = null;
    let sentimentByLanguageChart = null;
    let sentimentTrendChart = null;
    let positiveWordsChart = null;
    let neutralWordsChart = null;
    let negativeWordsChart = null;
    
    // Initialize Charts.js with global defaults
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#333333';
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.tooltip.padding = 10;
        Chart.defaults.plugins.tooltip.cornerRadius = 6;
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        Chart.defaults.animation.duration = 1000;
        Chart.defaults.animation.easing = 'easeOutQuart';
    }
    
    // Main tab navigation handling
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Jika tab dinonaktifkan, tampilkan peringatan dan hentikan
            if (this.classList.contains('disabled')) {
                showAlert('Silakan upload dan analisis data terlebih dahulu', 'warning');
                return;
            }
            
            const targetId = this.getAttribute('data-tab');
            
            // Remove active class from all links and content
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link and find corresponding content
            this.classList.add('active');
            const targetContent = document.getElementById(targetId);
            
            // Hanya lakukan operasi jika targetContent ada
            if (targetContent) {
                // Hide all tabs first
                mainTabContent.forEach(c => {
                    if (c) {
                        c.classList.remove('active');
                        c.classList.add('d-none');
                    }
                });
                
                // Show the target tab
                targetContent.classList.add('active');
                targetContent.classList.remove('d-none');
            } else {
                console.warn(`Target content with id "${targetId}" not found`);
            }
        });
    });
    
    // Analysis form submission
    if (analysisForm) {
        analysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading indicator and disable submit button
            if (loadingIndicator) loadingIndicator.classList.remove('d-none');
            if (submitBtn) submitBtn.disabled = true;
            
            // Get form data
            const formData = new FormData();
            const titleInput = document.getElementById('title');
            const csvFileInput = document.getElementById('csv-file');
            
            if (titleInput) formData.append('title', titleInput.value);
            else formData.append('title', 'Analisis Sentimen');
            
            formData.append('description', ''); // Removed description field
            
            if (csvFileInput && csvFileInput.files.length > 0) {
                formData.append('csv-file', csvFileInput.files[0]);
            } else {
                if (loadingIndicator) loadingIndicator.classList.add('d-none');
                if (submitBtn) submitBtn.disabled = false;
                showAlert('Error: No file selected', 'danger');
                return;
            }
            
            // Send to server
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading indicator and enable submit button
                if (loadingIndicator) loadingIndicator.classList.add('d-none');
                if (submitBtn) submitBtn.disabled = false;
                
                if (data.error) {
                    showAlert('Error: ' + data.error, 'danger');
                    return;
                }
                
                // Store global analysis results
                analysisResults = data;
                allTweets = data.tweets;
                
                // Show results and evaluation sections
                const resultsSection = document.getElementById('results');
                const evaluationSection = document.getElementById('evaluation');
                
                if (resultsSection) {
                    resultsSection.classList.remove('d-none');
                    resultsSection.classList.add('active');
                }
                
                if (evaluationSection) {
                    evaluationSection.classList.remove('d-none');
                }
                
                // Enable previously disabled tabs
                const resultsTabLink = document.querySelector('[data-tab="results"]');
                const evaluationTabLink = document.querySelector('[data-tab="evaluation"]');
                const downloadReportBtn = document.getElementById('download-report-btn');
                
                if (resultsTabLink) resultsTabLink.classList.remove('disabled');
                if (evaluationTabLink) evaluationTabLink.classList.remove('disabled');
                if (downloadReportBtn) downloadReportBtn.classList.remove('disabled');
                
                // Update navigation
                navLinks.forEach(l => {
                    if (l) l.classList.remove('active');
                });
                
                if (resultsTabLink) resultsTabLink.classList.add('active');
                
                // Update UI with analysis results
                updateAnalysisResults(data);
                
                // Initialize pagination
                initializePagination();
                
                // Generate topics automatically using the analysis results
                generateTopics(data);
                
                // Create word cloud (now in Analisis Kata tab)
                createImprovedWordCloud(data);
            })
            .catch(error => {
                if (loadingIndicator) loadingIndicator.classList.add('d-none');
                if (submitBtn) submitBtn.disabled = false;
                showAlert('Error: ' + error.message, 'danger');
            });
        });
    }
    
    // Chatbot send message
    if (chatbotSend && chatbotInput) {
        chatbotSend.addEventListener('click', sendChatbotMessage);
        chatbotInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendChatbotMessage();
            }
        });
    }
    
    // Topic button click
    if (chatbotTopicButtons) {
        chatbotTopicButtons.addEventListener('click', function(e) {
            if (e.target.classList.contains('topic-button') || e.target.closest('.topic-button')) {
                const topicButton = e.target.classList.contains('topic-button') ? e.target : e.target.closest('.topic-button');
                const topic = topicButton.getAttribute('data-topic') || topicButton.textContent.trim();
                if (chatbotInput) {
                    chatbotInput.value = `Berikan evaluasi kebijakan terkait ${topic}`;
                    sendChatbotMessage();
                }
            }
        });
    }
    
    // Sentiment filter change
    if (sentimentFilter) {
        sentimentFilter.addEventListener('change', function() {
            currentPage = 1;
            filterAndDisplayTweets();
        });
    }
    
    // Tweet search functionality
    if (tweetSearch) {
        tweetSearch.addEventListener('input', function() {
            searchQuery = this.value.trim().toLowerCase();
            currentPage = 1;
            filterAndDisplayTweets();
        });
    }
    
    // Items per page change
    if (itemsPerPage) {
        itemsPerPage.addEventListener('change', function() {
            tweetsPerPage = parseInt(this.value);
            currentPage = 1;
            filterAndDisplayTweets();
        });
    }
    
    // Initialize pagination
    function initializePagination() {
        if (allTweets && allTweets.length > 0) {
            filteredTweets = [...allTweets];
            filterAndDisplayTweets();
        }
    }
    
    // Filter tweets and update display
    function filterAndDisplayTweets() {
        if (!sentimentFilter || !allTweets || allTweets.length === 0) return;
        
        const selectedSentiment = sentimentFilter.value;
        
        // First filter by sentiment
        let tempFilteredTweets = [...allTweets];
        
        if (selectedSentiment !== 'all') {
            tempFilteredTweets = tempFilteredTweets.filter(tweet => tweet.predicted_sentiment === selectedSentiment);
        }
        
        // Then filter by search query if present
        if (searchQuery) {
            tempFilteredTweets = tempFilteredTweets.filter(tweet => {
                // Search in content, username or hashtags
                return (
                    (tweet.content && tweet.content.toLowerCase().includes(searchQuery)) || 
                    (tweet.username && tweet.username.toLowerCase().includes(searchQuery))
                );
            });
        }
        
        filteredTweets = tempFilteredTweets;
        
        // Update pagination
        updatePagination();
        
        // Display current page
        displayTweets();
    }
    
    // Update pagination controls
    function updatePagination() {
        if (!paginationContainer || !filteredTweets) return;
        
        const totalPages = Math.ceil(filteredTweets.length / tweetsPerPage);
        
        // Adjust current page if needed
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1;
        }
        
        // Clear pagination container
        paginationContainer.innerHTML = '';
        
        // Create pagination element
        const pagination = document.createElement('ul');
        pagination.className = 'pagination';
        
        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        const prevLink = document.createElement('a');
        prevLink.className = 'page-link';
        prevLink.href = '#';
        prevLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
        prevLink.setAttribute('aria-label', 'Previous');
        prevLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                displayTweets();
                updatePagination();
            }
        });
        prevLi.appendChild(prevLink);
        pagination.appendChild(prevLi);
        
        // Page numbers
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4 && startPage > 1) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = 'page-item' + (i === currentPage ? ' active' : '');
            const pageLink = document.createElement('a');
            pageLink.className = 'page-link';
            pageLink.href = '#';
            pageLink.textContent = i;
            pageLink.addEventListener('click', function(e) {
                e.preventDefault();
                currentPage = i;
                displayTweets();
                updatePagination();
            });
            pageLi.appendChild(pageLink);
            pagination.appendChild(pageLi);
        }
        
        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages || totalPages === 0 ? ' disabled' : '');
        const nextLink = document.createElement('a');
        nextLink.className = 'page-link';
        nextLink.href = '#';
        nextLink.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
        nextLink.setAttribute('aria-label', 'Next');
        nextLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                displayTweets();
                updatePagination();
            }
        });
        nextLi.appendChild(nextLink);
        pagination.appendChild(nextLi);
        
        // Append pagination to container
        paginationContainer.appendChild(pagination);
        
        // Show pagination info
        const paginationInfo = document.createElement('div');
        paginationInfo.className = 'text-muted mt-2 text-center';
        
        if (filteredTweets.length === 0) {
            paginationInfo.textContent = "Tidak ada tweet yang ditemukan";
        } else {
            const start = (currentPage - 1) * tweetsPerPage + 1;
            const end = Math.min(currentPage * tweetsPerPage, filteredTweets.length);
            paginationInfo.textContent = `Menampilkan ${start} sampai ${end} dari ${filteredTweets.length} tweets`;
        }
        
        paginationContainer.appendChild(paginationInfo);
    }
    
    // Display tweets for current page
    function displayTweets() {
        const tweetContainer = document.getElementById('tweet-container');
        if (!tweetContainer || !filteredTweets) return;
        
        tweetContainer.innerHTML = '';
        
        if (filteredTweets.length === 0) {
            if (searchQuery) {
                tweetContainer.innerHTML = '<p class="text-center text-muted my-5">Tidak ada tweet yang sesuai dengan pencarian.</p>';
            } else {
                tweetContainer.innerHTML = '<p class="text-center text-muted my-5">Tidak ada tweet yang ditemukan.</p>';
            }
            return;
        }
        
        // Calculate start and end index
        const startIndex = (currentPage - 1) * tweetsPerPage;
        const endIndex = Math.min(startIndex + tweetsPerPage, filteredTweets.length);
        
        // Display tweets for current page with animation
        for (let i = startIndex; i < endIndex; i++) {
            const tweet = filteredTweets[i];
            if (!tweet) continue;
            
            const tweetCard = document.createElement('div');
            tweetCard.className = 'tweet-card animate-fade-in';
            tweetCard.style.animationDelay = `${(i - startIndex) * 0.05}s`;
            
            const sentimentClass = tweet.predicted_sentiment === 'Positif' ? 'badge-positive' : 
                                   tweet.predicted_sentiment === 'Netral' ? 'badge-neutral' : 'badge-negative';
            
            // Process tweet content to make links clickable
            const linkifiedContent = linkifyText(tweet.content || '');
            
            // Format date to be more readable
            const formattedDate = formatDate(tweet.date || '');
            
            tweetCard.innerHTML = `
                <div class="tweet-header">
                    <span class="tweet-username">
                        <a href="https://twitter.com/${tweet.username || 'user'}" target="_blank">@${tweet.username || 'user'}</a>
                    </span>
                    <span class="tweet-date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${formattedDate}
                    </span>
                </div>
                <div class="tweet-content">
                    ${linkifiedContent}
                </div>
                ${tweet.image_url ? `<div class="tweet-image mt-2 mb-2">
                    <a href="${tweet.image_url}" target="_blank">
                        <img src="${tweet.image_url}" alt="Tweet image" class="img-fluid rounded" style="max-height: 200px;">
                    </a>
                </div>` : ''}
                <div class="tweet-stats">
                    <span title="Likes"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${formatNumber(tweet.likes)}</span>
                    <span title="Retweets"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg> ${formatNumber(tweet.retweets)}</span>
                    <span title="Replies"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> ${formatNumber(tweet.replies)}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div>
                        <span class="tweet-badge ${sentimentClass}">${tweet.predicted_sentiment || 'Unknown'}</span>
                        <span class="confidence-badge">${tweet.confidence ? tweet.confidence.toFixed(1) : '0'}%</span>
                    </div>
                    ${tweet.tweet_url ? `
                        <a href="${tweet.tweet_url}" class="btn btn-sm btn-outline-dark" target="_blank">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>
                            View on X
                        </a>` : ''}
                </div>
            `;
            
            tweetContainer.appendChild(tweetCard);
        }
    }
    
    // Helper function to format numbers (e.g., 1000 -> 1K)
    function formatNumber(num) {
        if (!num) return 0;
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num;
    }
    
    // Helper function to format date
    function formatDate(dateStr) {
        if (!dateStr) return '';
        
        const months = {
            'Jan': 'Januari',
            'Feb': 'Februari',
            'Mar': 'Maret',
            'Apr': 'April',
            'May': 'Mei',
            'Jun': 'Juni',
            'Jul': 'Juli',
            'Aug': 'Agustus',
            'Sep': 'September',
            'Oct': 'Oktober',
            'Nov': 'November',
            'Dec': 'Desember'
        };
        
        // Check if date is in format "DD MMM YYYY"
        const dateParts = dateStr.split(' ');
        if (dateParts.length === 3) {
            const day = dateParts[0];
            const month = months[dateParts[1]] || dateParts[1];
            const year = dateParts[2];
            return `${day} ${month} ${year}`;
        }
        
        return dateStr;
    }
    
    // Make links, hashtags and mentions clickable
    function linkifyText(text) {
        if (!text) return '';
        
        // URL pattern
        const urlPattern = /https?:\/\/[^\s]+/g;
        // Hashtag pattern
        const hashtagPattern = /#(\w+)/g;
        // Mention pattern
        const mentionPattern = /@(\w+)/g;
        
        // Replace URLs with clickable links
        let processedText = text.replace(urlPattern, url => 
            `<a href="${url}" target="_blank">${url.length > 30 ? url.substring(0, 27) + '...' : url}</a>`
        );
        
        // Replace hashtags with clickable links
        processedText = processedText.replace(hashtagPattern, (match, hashtag) => 
            `<a href="https://twitter.com/hashtag/${hashtag}" target="_blank" class="hashtag-link">${match}</a>`
        );
        
        // Replace mentions with clickable links
        processedText = processedText.replace(mentionPattern, (match, username) => 
            `<a href="https://twitter.com/${username}" target="_blank" class="mention-link">${match}</a>`
        );
        
        return processedText;
    }
    
    // Generate topics automatically based on analysis results
    function generateTopics(data) {
        if (!chatbotTopicButtons || !data) return;
        
        chatbotTopicButtons.innerHTML = '';
        
        // Base topics on hashtags, top words, and key program areas
        const topics = new Set();
        
        // Add from hashtags
        if (data.top_hashtags && data.top_hashtags.length > 0) {
            data.top_hashtags.slice(0, 7).forEach(hashtag => {
                if (hashtag && hashtag.tag) {
                    const topic = hashtag.tag.replace('#', '');
                    topics.add(topic);
                }
            });
        }
        
        // Add from topics
        if (data.topics && data.topics.length > 0) {
            data.topics.slice(0, 7).forEach(topic => {
                if (topic && topic.topic) {
                    topics.add(topic.topic);
                }
            });
        }
        
        // Get words from each sentiment category
        if (data.sentiment_words) {
            // Add top positive words
            if (data.sentiment_words.positive && data.sentiment_words.positive.length > 0) {
                data.sentiment_words.positive.slice(0, 3).forEach(item => {
                    if (item && item.word && item.word.length > 3) {
                        topics.add(item.word);
                    }
                });
            }
            
            // Add top negative words
            if (data.sentiment_words.negative && data.sentiment_words.negative.length > 0) {
                data.sentiment_words.negative.slice(0, 3).forEach(item => {
                    if (item && item.word && item.word.length > 3) {
                        topics.add(item.word);
                    }
                });
            }
        }
        
        const keyPolicyAreas = [
        ];
        
        keyPolicyAreas.forEach(topic => {
            topics.add(topic);
        });
        
        const topicIcons = {
            'default': ''
        };
        
        Array.from(topics).forEach(topic => {
            if (!topic) return;
            
            const button = document.createElement('button');
            button.className = 'topic-button animate-fade-in';
            button.setAttribute('data-topic', topic);
            
            // Select icon based on topic or use default
            const iconHtml = topicIcons[topic] || topicIcons['default'];
            
            button.innerHTML = `${iconHtml} ${topic}`;
            chatbotTopicButtons.appendChild(button);
        });
        
        // Add a message to indicate these are suggested topics
        const messageDiv = document.createElement('div');
        messageDiv.className = 'text-center w-100 mt-2 mb-2 animate-fade-in';
        messageDiv.innerHTML = '<small class="text-muted">Topik diatas dibuat otomatis dari data yang dianalisa</small>';
        chatbotTopicButtons.appendChild(messageDiv);
    }
    
    // Create improved word cloud
    function createImprovedWordCloud(data) {
        const wordCloudContainer = document.getElementById('word-cloud-container');
        if (!wordCloudContainer || !data || !data.tweets || data.tweets.length === 0) return;
        
        // Add loading indicator
        wordCloudContainer.innerHTML = '<div class="chart-loader"><div class="spinner"></div></div>';
        
        // Check if d3 is available
        if (typeof d3 === 'undefined') {
            wordCloudContainer.innerHTML = '<p class="text-center text-muted my-5">D3.js library is not available. Word cloud cannot be generated.</p>';
            return;
        }
        
        // Create word frequency counts
        const wordFrequencies = {};
        
        // Stopwords to filter out (expanded list)
        const stopwords = [
            'yang', 'dan', 'di', 'dengan', 'untuk', 'pada', 'adalah', 'ini', 'itu', 'atau', 'juga',
            'dari', 'akan', 'ke', 'karena', 'oleh', 'saat', 'dalam', 'secara', 'telah', 'sebagai',
            'bahwa', 'dapat', 'para', 'harus', 'namun', 'seperti', 'hingga', 'tak', 'tidak', 'tapi',
            'kita', 'kami', 'saya', 'mereka', 'dia', 'http', 'https', 'co', 't', 'a', 'amp', 'rt',
            'nya', 'yg', 'dgn', 'utk', 'dr', 'pd', 'jd', 'sdh', 'tdk', 'bisa', 'ada', 'kalo', 'bgt',
            'aja', 'gitu', 'gak', 'mau', 'biar', 'kan', 'klo', 'deh', 'sih', 'nya', 'nih', 'loh'
        ];
        
        // Process each tweet to extract words
        data.tweets.forEach(tweet => {
            if (!tweet || !tweet.content) return;
            
            // Extract words from content
            let content = tweet.content.toLowerCase();
            
            // Remove URLs
            content = content.replace(/https?:\/\/[^\s]+/g, '');
            
            // Remove special characters and emoji
            content = content.replace(/[^\w\s]/g, ' ');
            
            // Split into words
            const words = content.split(/\s+/);
            
            // Filter words
            const filteredWords = words.filter(word => 
                word && 
                word.length > 3 &&  // Filter words with length > 3
                !stopwords.includes(word) &&  // Filter out stopwords
                !/^\d+$/.test(word)  // Filter out numbers
            );
            
            // Count word frequencies
            filteredWords.forEach(word => {
                wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            });
        });
        
        // Convert to array for word cloud
        const wordsArray = Object.entries(wordFrequencies)
            .map(([text, value]) => ({ text, value }))
            .filter(item => item.value > 1)  // Filter words that appear more than once
            .sort((a, b) => b.value - a.value)
            .slice(0, 100);  // Limit to top 100 words
        
        if (wordsArray.length === 0) {
            wordCloudContainer.innerHTML = '<p class="text-center text-muted my-5">Tidak cukup data untuk menampilkan word cloud.</p>';
            return;
        }
        
        // Normalize word sizes between minSize and maxSize
        const minCount = Math.min(...wordsArray.map(w => w.value));
        const maxCount = Math.max(...wordsArray.map(w => w.value));
        const minSize = 12;
        const maxSize = 60;
        
        // Adjust word sizes
        wordsArray.forEach(word => {
            // Normalize size
            const size = minSize + ((word.value - minCount) / (maxCount - minCount || 1)) * (maxSize - minSize);
            word.size = size;
            
            // Assign a color based on sentiment association
            // Use a black/gray scale for the monochrome theme
            const intensity = Math.round((word.value - minCount) / (maxCount - minCount || 1) * 200);
            word.color = `rgb(${intensity}, ${intensity}, ${intensity})`;
        });
        
        try {
            // Create SVG element
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.opacity = 0;
            wordCloudContainer.innerHTML = '';
            wordCloudContainer.appendChild(svg);
            
            // Set up word cloud layout
            const width = wordCloudContainer.clientWidth || 500;
            const height = wordCloudContainer.clientHeight || 400;
            
            // Check if d3.layout.cloud is available
            if (typeof d3.layout.cloud !== 'function') {
                wordCloudContainer.innerHTML = '<p class="text-center text-muted my-5">d3-cloud library is not available. Word cloud cannot be generated.</p>';
                return;
            }
            
            // Use d3.layout.cloud for the word cloud
            const layout = d3.layout.cloud()
                .size([width, height])
                .words(wordsArray)
                .padding(5)
                .rotate(() => Math.random() < 0.5 ? 0 : 90)
                .font('Inter')
                .fontSize(d => d.size)
                .on('end', draw);
            
            layout.start();
            
            function draw(words) {
                // Remove loading spinner
                const loadingIndicator = wordCloudContainer.querySelector('.chart-loader');
                if (loadingIndicator) {
                    wordCloudContainer.removeChild(loadingIndicator);
                }
                
                d3.select(svg)
                    .attr('width', layout.size()[0])
                    .attr('height', layout.size()[1])
                    .append('g')
                    .attr('transform', `translate(${layout.size()[0] / 2},${layout.size()[1] / 2})`)
                    .selectAll('text')
                    .data(words)
                    .enter()
                    .append('text')
                    .style('font-size', d => `${d.size}px`)
                    .style('font-family', 'Inter, sans-serif')
                    .style('font-weight', d => Math.min(900, 300 + Math.floor(d.size * 10)))
                    .style('fill', d => d.color)
                    .attr('text-anchor', 'middle')
                    .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
                    .text(d => d.text)
                    .style('opacity', 0)
                    .transition()
                    .duration(1000)
                    .style('opacity', 1);
                
                // Fade in the SVG
                svg.style.transition = 'opacity 1s ease';
                svg.style.opacity = 1;
            }
        } catch (error) {
            console.error("Error creating word cloud:", error);
            // Fallback to simple word display
            wordCloudContainer.innerHTML = '';
            
            const wordCloudFallback = document.createElement('div');
            wordCloudFallback.className = 'd-flex flex-wrap justify-content-center align-items-center h-100';
            
            wordsArray.slice(0, 50).forEach((word, index) => {
                const wordSpan = document.createElement('span');
                wordSpan.textContent = word.text;
                wordSpan.style.fontSize = `${word.size / 10}rem`;
                wordSpan.style.fontWeight = Math.min(900, 300 + Math.floor(word.size * 10));
                wordSpan.style.color = word.color;
                wordSpan.style.padding = '5px';
                wordSpan.style.display = 'inline-block';
                wordSpan.style.transition = 'all 0.3s ease';
                wordSpan.style.opacity = 0;
                wordSpan.style.transform = 'translateY(20px)';
                
                wordSpan.addEventListener('mouseover', function() {
                    this.style.transform = 'scale(1.2)';
                    this.style.color = '#000000';
                });
                
                wordSpan.addEventListener('mouseout', function() {
                    this.style.transform = 'scale(1)';
                    this.style.color = word.color;
                });
                
                wordCloudFallback.appendChild(wordSpan);
                
                // Animate entrance with delay based on index
                setTimeout(() => {
                    wordSpan.style.opacity = 1;
                    wordSpan.style.transform = 'translateY(0)';
                }, 50 * index);
            });
            
            wordCloudContainer.appendChild(wordCloudFallback);
        }
    }
    
    // Function to update analysis results in UI
    function updateAnalysisResults(data) {
        if (!data) return;
        
        // Update title and description
        const titlePlaceholder = document.getElementById('title-placeholder');
        if (titlePlaceholder) titlePlaceholder.textContent = data.title || '';
        
        // Update counts and percentages
        const elements = {
            totalTweets: document.getElementById('total-tweets'),
            positiveCount: document.getElementById('positive-count'),
            neutralCount: document.getElementById('neutral-count'),
            negativeCount: document.getElementById('negative-count'),
            positivePercent: document.getElementById('positive-percent'),
            neutralPercent: document.getElementById('neutral-percent'),
            negativePercent: document.getElementById('negative-percent'),
            positiveSegment: document.getElementById('positive-segment'),
            neutralSegment: document.getElementById('neutral-segment'),
            negativeSegment: document.getElementById('negative-segment'),
            positiveStats: document.getElementById('positive-stats'),
            neutralStats: document.getElementById('neutral-stats'),
            negativeStats: document.getElementById('negative-stats'),
            topHashtags: document.getElementById('top-hashtags'),
            allHashtags: document.getElementById('all-hashtags'),
            topUsers: document.getElementById('top-users'),
            mainTopics: document.getElementById('main-topics'),
            topikUtama: document.getElementById('topik-utama'),
            hashtagSentiment: document.getElementById('hashtag-sentiment'),
            sentimentPlot: document.getElementById('sentiment-plot')
        };
        
        // Update counts
        if (elements.totalTweets) elements.totalTweets.textContent = data.total_tweets || 0;
        if (elements.positiveCount) elements.positiveCount.textContent = data.positive_count || 0;
        if (elements.neutralCount) elements.neutralCount.textContent = data.neutral_count || 0;
        if (elements.negativeCount) elements.negativeCount.textContent = data.negative_count || 0;
        
        // Update percentages
        if (elements.positivePercent) elements.positivePercent.textContent = (data.positive_percent || 0) + '%';
        if (elements.neutralPercent) elements.neutralPercent.textContent = (data.neutral_percent || 0) + '%';
        if (elements.negativePercent) elements.negativePercent.textContent = (data.negative_percent || 0) + '%';
        
        // Update sentiment distribution with animation
        if (elements.positiveSegment && elements.neutralSegment && elements.negativeSegment) {
            // Reset widths first
            elements.positiveSegment.style.width = '0%';
            elements.neutralSegment.style.width = '0%';
            elements.negativeSegment.style.width = '0%';
            
            // Then animate to new values
            setTimeout(() => {
                if (elements.positiveSegment) {
                    elements.positiveSegment.style.width = (data.positive_percent || 0) + '%';
                    elements.positiveSegment.textContent = (data.positive_percent || 0) + '%';
                }
                if (elements.neutralSegment) {
                    elements.neutralSegment.style.width = (data.neutral_percent || 0) + '%';
                    elements.neutralSegment.textContent = (data.neutral_percent || 0) + '%';
                }
                if (elements.negativeSegment) {
                    elements.negativeSegment.style.width = (data.negative_percent || 0) + '%';
                    elements.negativeSegment.textContent = (data.negative_percent || 0) + '%';
                }
            }, 100);
        }
        
        // Update stats cards icons
        if (elements.positiveStats) {
            elements.positiveStats.className = 'stats-card positive animate-fade-in';
            const iconElement = elements.positiveStats.querySelector('.icon');
            if (iconElement) {
                iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>';
            }
        }
        
        if (elements.neutralStats) {
            elements.neutralStats.className = 'stats-card neutral animate-fade-in';
            const iconElement = elements.neutralStats.querySelector('.icon');
            if (iconElement) {
                iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
            }
        }
        
        if (elements.negativeStats) {
            elements.negativeStats.className = 'stats-card negative animate-fade-in';
            const iconElement = elements.negativeStats.querySelector('.icon');
            if (iconElement) {
                iconElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>';
            }
        }
        
        // Update top hashtags
        if (elements.topHashtags && data.top_hashtags && data.top_hashtags.length) {
            elements.topHashtags.innerHTML = '';
            
            data.top_hashtags.forEach((hashtag, index) => {
                if (!hashtag) return;
                
                const tag = document.createElement('div');
                tag.className = 'tag animate-fade-in';
                tag.style.animationDelay = `${index * 0.1}s`;
                tag.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16"></path><path d="M4 15h16"></path><path d="M10 3L8 21"></path><path d="M16 3l-2 18"></path></svg> ${hashtag.tag} (${hashtag.count})`;
                elements.topHashtags.appendChild(tag);
            });
        }
        
        // Update all hashtags
        if (elements.allHashtags && data.top_hashtags && data.top_hashtags.length) {
            elements.allHashtags.innerHTML = '';
            
            data.top_hashtags.forEach((hashtag, index) => {
                if (!hashtag) return;
                
                const tag = document.createElement('div');
                tag.className = 'tag animate-fade-in';
                tag.style.animationDelay = `${index * 0.05}s`;
                tag.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16"></path><path d="M4 15h16"></path><path d="M10 3L8 21"></path><path d="M16 3l-2 18"></path></svg> ${hashtag.tag} (${hashtag.count})`;
                elements.allHashtags.appendChild(tag);
            });
        }
        
        // Update top users
        if (elements.topUsers && data.top_users && data.top_users.length) {
            elements.topUsers.innerHTML = '';
            
            data.top_users.forEach(user => {
                if (!user) return;
                
                const row = document.createElement('tr');
                row.className = 'animate-fade-in';
                
                const sentimentClass = user.dominant_sentiment === 'Positif' ? 'sentiment-positive' : 
                                      user.dominant_sentiment === 'Netral' ? 'sentiment-neutral' : 'sentiment-negative';
                
                row.innerHTML = `
                    <td><a href="https://twitter.com/${user.username || ''}" target="_blank">@${user.username || ''}</a></td>
                    <td>${user.count || 0}</td>
                    <td>${Math.round(user.avg_engagement || 0)}</td>
                    <td><span class="${sentimentClass}">${user.dominant_sentiment || 'Unknown'}</span></td>
                `;
                
                elements.topUsers.appendChild(row);
            });
        }
        
        // Update main topics
        if (elements.mainTopics && data.topics && data.topics.length) {
            elements.mainTopics.innerHTML = '';
            
            data.topics.forEach((topic, index) => {
                if (!topic) return;
                
                const row = document.createElement('tr');
                row.className = 'animate-fade-in';
                row.style.animationDelay = `${index * 0.1}s`;
                
                row.innerHTML = `
                    <td>${topic.topic || ''}</td>
                    <td>${topic.frequency || 0}</td>
                `;
                
                elements.mainTopics.appendChild(row);
            });
        }
        
        // Update topik utama
        if (elements.topikUtama && data.topics && data.topics.length) {
            elements.topikUtama.innerHTML = '';
            
            data.topics.forEach((topic, index) => {
                if (!topic) return;
                
                const row = document.createElement('tr');
                row.className = 'animate-fade-in';
                row.style.animationDelay = `${index * 0.1}s`;
                
                row.innerHTML = `
                    <td>${topic.topic || ''}</td>
                    <td>${topic.frequency || 0}</td>
                `;
                
                elements.topikUtama.appendChild(row);
            });
        }
        
        // Update hashtag sentiment
        if (elements.hashtagSentiment && data.hashtag_sentiment && data.hashtag_sentiment.length) {
            elements.hashtagSentiment.innerHTML = '';
            
            data.hashtag_sentiment.forEach((stat, index) => {
                if (!stat) return;
                
                const row = document.createElement('tr');
                row.className = 'animate-fade-in';
                row.style.animationDelay = `${index * 0.1}s`;
                
                row.innerHTML = `
                    <td>${stat.tag || ''}</td>
                    <td>${stat.positive || 0}%</td>
                    <td>${stat.neutral || 0}%</td>
                    <td>${stat.negative || 0}%</td>
                    <td>${stat.total || 0}</td>
                `;
                
                elements.hashtagSentiment.appendChild(row);
            });
        }
        
        // Initialize data for charts
        if (data.hashtag_sentiment) {
            createSentimentByHashtagChart(data.hashtag_sentiment);
        }
        
        if (data.tweets) {
            createSentimentByLocationChart(data.tweets);
            createSentimentByLanguageChart(data.tweets);
        }
        
        if (data.sentiment_words) {
            createTopWordsCharts(data.sentiment_words);
        }
        
        // Update sentiment plot
        if (elements.sentimentPlot && data.sentiment_plot) {
            elements.sentimentPlot.src = 'data:image/png;base64,' + data.sentiment_plot;
            elements.sentimentPlot.classList.remove('d-none');
            elements.sentimentPlot.classList.add('animate-fade-in');
        } else if (elements.sentimentPlot) {
            elements.sentimentPlot.classList.add('d-none');
        }

        // Initialize the welcome message in chatbot
        initializeChatbot(data);
    }
    
    // Initialize chatbot with welcome message
    function initializeChatbot(data) {
        if (!chatbotMessages || !data) return;
        
        // Clear any existing messages
        chatbotMessages.innerHTML = '';
        
        // Create welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'message message-bot animate-fade-in';
        
        // Build the welcome message with data from analysis
        let messageContent = `
            <div class="mb-2"><strong>Selamat datang di Chatbot Evaluasi Kebijakan!</strong></div>
            <p>Saya akan membantu Anda menganalisis data sentimen X tentang ${data.title || 'topik ini'}.</p>
            <div class="mb-2"><strong>Ringkasan Analisis:</strong></div>
            <ul>
                <li>Total tweets: ${data.total_tweets || 0}</li>
                <li>Sentimen Positif: ${data.positive_count || 0} tweets (${data.positive_percent || 0}%)</li>
                <li>Sentimen Netral: ${data.neutral_count || 0} tweets (${data.neutral_percent || 0}%)</li>
                <li>Sentimen Negatif: ${data.negative_count || 0} tweets (${data.negative_percent || 0}%)</li>
            </ul>
            <p>Silakan pilih topik di bawah ini atau ajukan pertanyaan Anda sendiri.</p>
        `;
        
        welcomeMessage.innerHTML = messageContent;
        chatbotMessages.appendChild(welcomeMessage);
        
        // Scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    // Function to create sentiment by hashtag chart
    function createSentimentByHashtagChart(hashtagSentimentData) {
        const chartContainer = document.getElementById('sentiment-by-hashtag-chart');
        if (!chartContainer || !hashtagSentimentData || hashtagSentimentData.length === 0 || typeof Chart === 'undefined') return;
        
        // Add loading indicator
        chartContainer.innerHTML = '<div class="chart-loader"><div class="spinner"></div></div>';
        
        try {
            // Take top 5 hashtags by total count
            const top5Hashtags = hashtagSentimentData
                .sort((a, b) => (b.total || 0) - (a.total || 0))
                .slice(0, 5);
            
            if (top5Hashtags.length === 0) {
                chartContainer.innerHTML = '<p class="text-center text-muted my-5">Tidak cukup data untuk menampilkan grafik.</p>';
                return;
            }
            
            const labels = top5Hashtags.map(item => item.tag || '');
            const positiveData = top5Hashtags.map(item => item.positive || 0);
            const neutralData = top5Hashtags.map(item => item.neutral || 0);
            const negativeData = top5Hashtags.map(item => item.negative || 0);
            
            // Create chart
            const ctx = document.createElement('canvas');
            chartContainer.innerHTML = '';
            chartContainer.appendChild(ctx);
            
            // Destroy previous chart instance if exists
            if (sentimentByHashtagChart) {
                sentimentByHashtagChart.destroy();
            }
            
            // Create new chart
            sentimentByHashtagChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Positif',
                            data: positiveData,
                            backgroundColor: '#ffffff',
                            borderColor: '#dddddd',
                            borderWidth: 1
                        },
                        {
                            label: 'Netral',
                            data: neutralData,
                            backgroundColor: '#9e9e9e',
                            borderColor: '#757575',
                            borderWidth: 1
                        },
                        {
                            label: 'Negatif',
                            data: negativeData,
                            backgroundColor: '#000000',
                            borderColor: '#000000',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Hashtag',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Persentase (%)',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            min: 0,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Sentimen Berdasarkan Hashtag (Top 5)',
                            font: {
                                size: 16,
                                weight: 'bold'
                            },
                            padding: {
                                bottom: 15
                            }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.dataset.label + ': ' + context.raw + '%';
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 1000,
                        easing: 'easeOutQuart'
                    }
                }
            });
        } catch (error) {
            console.error("Error creating sentiment by hashtag chart:", error);
            chartContainer.innerHTML = '<p class="text-center text-muted my-5">Error creating chart.</p>';
        }
    }
    
    // Support for example questions 
    const exampleQuestions = document.querySelectorAll('.example-question');
    if (exampleQuestions.length > 0) {
        exampleQuestions.forEach(question => {
            question.addEventListener('click', function() {
                if (chatbotInput) {
                    chatbotInput.value = this.textContent.trim();
                    if (chatbotSend) {
                        chatbotSend.click();
                    }
                }
            });
        });
    }

    // Function to send message to chatbot
    function sendChatbotMessage() {
        if (!chatbotInput || !chatbotMessages) return;
        
        const messageText = chatbotInput.value.trim();
        
        if (!messageText) return;
        
        // Add user message to chat
        const userMessage = document.createElement('div');
        userMessage.className = 'message message-user animate-fade-in';
        userMessage.textContent = messageText;
        chatbotMessages.appendChild(userMessage);
        
        // Clear input
        chatbotInput.value = '';
        
        // Add loading indicator
        const loadingMessage = document.createElement('div');
        loadingMessage.className = 'message message-bot animate-fade-in';
        loadingMessage.innerHTML = '<div class="d-flex align-items-center"><div class="spinner-grow spinner-grow-sm me-2" role="status"></div><span>Menganalisis data dan menyusun respons...</span></div>';
        chatbotMessages.appendChild(loadingMessage);
        
        // Scroll to bottom
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
        // Send to server
        fetch('/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({message: messageText})
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading message
            if (loadingMessage.parentNode) {
                chatbotMessages.removeChild(loadingMessage);
            }
            
            // Format the response text with proper line breaks and formatting
            const formattedResponse = formatChatbotResponse(data.response || '');
            
            // Add bot response with animation
            const botMessage = document.createElement('div');
            botMessage.className = 'message message-bot animate-fade-in';
            botMessage.innerHTML = formattedResponse;
            chatbotMessages.appendChild(botMessage);
            
            // Scroll to bottom
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        })
        .catch(error => {
            console.error("Chatbot error:", error);
            
            // Remove loading message if it exists
            if (loadingMessage.parentNode) {
                chatbotMessages.removeChild(loadingMessage);
            }
            
            // Add error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'message message-bot animate-fade-in';
            errorMessage.textContent = 'Maaf, terjadi kesalahan dalam berkomunikasi dengan chatbot. Silakan coba lagi.';
            chatbotMessages.appendChild(errorMessage);
            
            // Scroll to bottom
            chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        });
    }
    
    // Format chatbot response with proper HTML formatting
    function formatChatbotResponse(text) {
        if (!text) return '';
        
        // Convert line breaks to <br>
        let formatted = text.replace(/\n/g, '<br>');
        
        // Format numbered lists (1. Item)
        formatted = formatted.replace(/(\d+\.\s+[^\n<]+)(<br>|$)/g, '<li>$1</li>');
        
        // Format bullet points (- Item or • Item)
        formatted = formatted.replace(/([-•]\s+[^\n<]+)(<br>|$)/g, '<li>$1</li>');
        
        // Wrap lists in <ul> tags
        formatted = formatted.replace(/<li>([^<]+)<\/li>(<li>)/g, '<li>$1</li>$2');
        formatted = formatted.replace(/<li>([^<]+)<\/li>(?!<li>)/g, '<ul><li>$1</li></ul>');
        formatted = formatted.replace(/<\/ul><ul>/g, '');
        
        // Bold text between asterisks (*text*)
        formatted = formatted.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
        
        // Italic text between underscores (_text_)
        formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
        
        // Create paragraphs for text blocks
        formatted = '<p>' + formatted.replace(/<br><br>/g, '</p><p>') + '</p>';
        
        // Clean up empty paragraphs
        formatted = formatted.replace(/<p><\/p>/g, '');
        
        return formatted;
    }
    
    // Function to show alert
    function showAlert(message, type) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show animate-fade-in`;
        alert.role = 'alert';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    // Functions that are called but were not included in the excerpt - to avoid errors
    // Add stubs for the missing functions
    
    function createSentimentByLocationChart() {
        // Implementasi disesuaikan bila diperlukan
    }
    
    function createSentimentByLanguageChart() {
        // Implementasi disesuaikan bila diperlukan
    }
    
    function createTopWordsCharts() {
        // Implementasi disesuaikan bila diperlukan
    }
});