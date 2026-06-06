import nltk
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import numpy as np
from collections import Counter
import re
from .lancaster_norms import LancasterNorms
from .file_reader import FileReader
import logging

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('tokenizers/punkt_tab')
except LookupError:
    nltk.download('punkt_tab', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)

logger = logging.getLogger(__name__)

class TextAnalyzer:
    def __init__(self):
        try:
            self.sentiment_analyzer = SentimentIntensityAnalyzer()
        except Exception as e:
            logger.error(f"Failed to initialize VADER sentiment analyzer: {str(e)}")
            self.sentiment_analyzer = None

        try:
            self.lancaster_norms = LancasterNorms()
        except Exception as e:
            logger.warning(f"Failed to initialize Lancaster norms: {str(e)}")
            self.lancaster_norms = None

        try:
            self.stop_words = set(nltk.corpus.stopwords.words('english'))
        except Exception as e:
            logger.warning(f"Failed to load stopwords, using empty set: {str(e)}")
            self.stop_words = set()

        try:
            self.file_reader = FileReader()
        except Exception as e:
            logger.error(f"Failed to initialize file reader: {str(e)}")
            self.file_reader = None
    
    def read_file(self, filepath):
        """Read text from file using FileReader"""
        return self.file_reader.read_file(filepath)
    
    def update_progress(self, session_id, progress, progress_tracker):
        """Update progress for async processing"""
        if session_id and progress_tracker is not None:
            progress_tracker[session_id] = progress
    
    def analyze_file(self, filepath, session_id=None, progress_tracker=None):
        """Main analysis pipeline"""
        try:
            # Read file - Stage: upload (0-14%)
            text = self.read_file(filepath)
            self.update_progress(session_id, 14, progress_tracker)

            # Preprocess text - Stage: preprocessing (14-28%)
            tokens = nltk.word_tokenize(text.lower())
            words = [word for word in tokens if word.isalpha() and word not in self.stop_words]
            self.update_progress(session_id, 28, progress_tracker)

            # Keyness analysis - Stage: keyness (28-46%)
            keyness = self.calculate_keyness(words)
            self.update_progress(session_id, 46, progress_tracker)

            # Sentiment analysis - Stage: sentiment (46-64%)
            sentiment = self.analyze_sentiment(text)
            self.update_progress(session_id, 64, progress_tracker)

            # Semantic clustering - Stage: clustering (64-78%)
            clusters = self.semantic_clustering(words)
            self.update_progress(session_id, 78, progress_tracker)

            # Sensorimotor norms - Stage: sensorimotor (78-92%)
            sensorimotor = self.analyze_sensorimotor(words)
            self.update_progress(session_id, 92, progress_tracker)

            # Enhanced statistics - Stage: finalize (92-100%)
            sentences = nltk.sent_tokenize(text)
            stats = self.calculate_comprehensive_stats(text, tokens, words, sentences)
            self.update_progress(session_id, 100, progress_tracker)
            
            return {
                'filename': filepath.split('/')[-1],
                'stats': stats,
                'keyness': keyness,
                'sentiment': sentiment,
                'clusters': clusters,
                'sensorimotor': sensorimotor
            }
            
        except Exception as e:
            logger.error(f"Analysis error: {str(e)}")
            raise
    
    def calculate_keyness(self, words):
        """Calculate keyness scores for words"""
        word_freq = Counter(words)
        total_words = sum(word_freq.values())
        
        # Calculate relative frequency
        keyness_scores = {}
        for word, freq in word_freq.most_common(50):
            keyness_scores[word] = {
                'frequency': freq,
                'relative_frequency': freq / total_words,
                'log_likelihood': np.log(freq + 1) * freq  # Simplified log-likelihood
            }
        
        return keyness_scores
    
    def analyze_sentiment(self, text):
        """Advanced sentiment and emotion analysis"""
        # VADER sentiment
        if self.sentiment_analyzer:
            vader_scores = self.sentiment_analyzer.polarity_scores(text)
        else:
            vader_scores = {'compound': 0, 'pos': 0, 'neg': 0, 'neu': 1.0}
            logger.warning("VADER not available, using default scores")

        # TextBlob sentiment
        try:
            blob = TextBlob(text)
            subjectivity = blob.sentiment.subjectivity
            polarity = blob.sentiment.polarity
        except Exception as e:
            logger.warning(f"TextBlob analysis failed: {str(e)}")
            subjectivity = 0.5
            polarity = 0.0

        # Expanded emotion detection (12 emotions)
        emotions = {
            'joy': 0, 'sadness': 0, 'anger': 0, 'fear': 0, 'surprise': 0,
            'disgust': 0, 'trust': 0, 'anticipation': 0, 'love': 0,
            'guilt': 0, 'shame': 0, 'pride': 0
        }

        # Comprehensive emotion keyword lexicon with intensity weights
        emotion_keywords = {
            'joy': {
                'high': ['ecstatic', 'elated', 'overjoyed', 'thrilled', 'euphoric', 'blissful'],
                'medium': ['happy', 'joyful', 'cheerful', 'delighted', 'pleased', 'glad', 'content'],
                'low': ['good', 'nice', 'fine', 'okay', 'pleasant', 'satisfied']
            },
            'sadness': {
                'high': ['devastated', 'heartbroken', 'miserable', 'depressed', 'despairing'],
                'medium': ['sad', 'unhappy', 'disappointed', 'sorrowful', 'melancholy', 'gloomy'],
                'low': ['down', 'blue', 'upset', 'disheartened', 'discouraged']
            },
            'anger': {
                'high': ['furious', 'enraged', 'outraged', 'livid', 'seething'],
                'medium': ['angry', 'mad', 'irritated', 'annoyed', 'frustrated', 'resentful'],
                'low': ['bothered', 'displeased', 'aggravated', 'irked']
            },
            'fear': {
                'high': ['terrified', 'petrified', 'horrified', 'panicked'],
                'medium': ['afraid', 'scared', 'fearful', 'anxious', 'worried', 'nervous'],
                'low': ['concerned', 'uneasy', 'apprehensive', 'tense']
            },
            'surprise': {
                'high': ['astonished', 'astounded', 'shocked', 'stunned', 'flabbergasted'],
                'medium': ['surprised', 'amazed', 'startled', 'unexpected'],
                'low': ['curious', 'intrigued', 'wondering']
            },
            'disgust': {
                'high': ['revolted', 'repulsed', 'sickened', 'nauseated'],
                'medium': ['disgusted', 'grossed', 'appalled', 'repelled'],
                'low': ['unpleasant', 'distasteful', 'offensive']
            },
            'trust': {
                'high': ['devoted', 'loyal', 'faithful', 'dedicated'],
                'medium': ['trust', 'trusting', 'reliable', 'confident', 'secure'],
                'low': ['comfortable', 'safe', 'assured']
            },
            'anticipation': {
                'high': ['eager', 'enthusiastic', 'excited', 'thrilled'],
                'medium': ['anticipate', 'expecting', 'hopeful', 'optimistic'],
                'low': ['interested', 'ready', 'prepared']
            },
            'love': {
                'high': ['adore', 'cherish', 'treasure', 'passionate'],
                'medium': ['love', 'loving', 'affection', 'care', 'caring', 'fondness'],
                'low': ['like', 'fond', 'attracted', 'drawn']
            },
            'guilt': {
                'high': ['remorseful', 'regretful', 'ashamed'],
                'medium': ['guilty', 'guilt', 'regret', 'sorry'],
                'low': ['apologetic', 'repentant']
            },
            'shame': {
                'high': ['humiliated', 'mortified', 'embarrassed'],
                'medium': ['shame', 'shameful', 'disgraced'],
                'low': ['awkward', 'uncomfortable', 'self-conscious']
            },
            'pride': {
                'high': ['triumphant', 'victorious', 'accomplished'],
                'medium': ['proud', 'pride', 'confident', 'satisfied'],
                'low': ['pleased', 'content', 'successful']
            }
        }

        # Count emotions with intensity
        emotion_intensities = {emotion: {'high': 0, 'medium': 0, 'low': 0} for emotion in emotions.keys()}
        emotion_words_found = {emotion: [] for emotion in emotions.keys()}

        text_lower = text.lower()
        # FIX: Use proper tokenization to avoid substring false matches
        tokens = [word for word in nltk.word_tokenize(text_lower) if word.isalpha()]

        for emotion, intensity_dict in emotion_keywords.items():
            for intensity, keywords in intensity_dict.items():
                for keyword in keywords:
                    # FIX: Use exact word matching instead of substring matching
                    # This prevents false positives like "happiness" matching "app"
                    if keyword in tokens:
                        weight = 3 if intensity == 'high' else 2 if intensity == 'medium' else 1
                        # Count how many times this exact keyword appears
                        keyword_count = tokens.count(keyword)
                        emotions[emotion] += weight * keyword_count
                        emotion_intensities[emotion][intensity] += keyword_count
                        if keyword not in emotion_words_found[emotion]:
                            emotion_words_found[emotion].append(keyword)

        # Normalize emotions
        total_emotions = sum(emotions.values())
        if total_emotions > 0:
            emotions_normalized = {k: v/total_emotions for k, v in emotions.items()}
        else:
            emotions_normalized = emotions

        # Sentence-level sentiment analysis
        sentences = nltk.sent_tokenize(text)
        sentence_sentiments = []
        
        for i, sentence in enumerate(sentences[:50]):  # Limit to 50 sentences for performance
            if self.sentiment_analyzer:
                sent_score = self.sentiment_analyzer.polarity_scores(sentence)
                sentence_sentiments.append({
                    'sentence_num': i + 1,
                    'text': sentence[:100] + '...' if len(sentence) > 100 else sentence,
                    'compound': sent_score['compound'],
                    'sentiment': 'positive' if sent_score['compound'] > 0.05 else 'negative' if sent_score['compound'] < -0.05 else 'neutral'
                })

        # Calculate advanced metrics
        # Valence (pleasantness), Arousal (intensity), Dominance (control)
        valence = vader_scores['compound']  # -1 to 1
        arousal = abs(vader_scores['compound']) + (1 - vader_scores['neu'])  # How intense
        dominance = subjectivity  # How much control/confidence

        # Emotion diversity
        active_emotions = sum(1 for v in emotions_normalized.values() if v > 0.05)
        emotion_diversity = active_emotions / len(emotions_normalized)

        # Dominant emotion
        dominant_emotion = max(emotions_normalized.items(), key=lambda x: x[1])[0] if total_emotions > 0 else 'neutral'
        dominant_intensity = max(emotions_normalized.values()) if total_emotions > 0 else 0

        return {
            'overall_sentiment': vader_scores['compound'],
            'positive': vader_scores['pos'],
            'negative': vader_scores['neg'],
            'neutral': vader_scores['neu'],
            'subjectivity': subjectivity,
            'polarity': polarity,
            'emotions': emotions_normalized,
            'emotion_raw_counts': emotions,
            'emotion_intensities': emotion_intensities,
            'emotion_words': emotion_words_found,
            'sentence_sentiments': sentence_sentiments,
            'advanced_metrics': {
                'valence': round(valence, 3),
                'arousal': round(min(arousal, 1.0), 3),
                'dominance': round(dominance, 3),
                'emotion_diversity': round(emotion_diversity, 3),
                'dominant_emotion': dominant_emotion,
                'dominant_intensity': round(dominant_intensity, 3)
            },
            'sentiment_stats': {
                'total_sentences': len(sentences),
                'positive_sentences': sum(1 for s in sentence_sentiments if s['sentiment'] == 'positive'),
                'negative_sentences': sum(1 for s in sentence_sentiments if s['sentiment'] == 'negative'),
                'neutral_sentences': sum(1 for s in sentence_sentiments if s['sentiment'] == 'neutral')
            }
        }
    
    def semantic_clustering(self, words, num_clusters=None):
        """Cluster words into semantic groups using K-means"""
        if len(words) < 50:
            return {'clusters': [], 'message': 'Text too short for clustering'}

        # Create word frequency dict
        word_freq = Counter(words)
        unique_words = list(word_freq.keys())

        # Limit to most frequent words for better clustering
        if len(unique_words) > 100:
            unique_words = [w for w, _ in word_freq.most_common(100)]

        # Need at least 10 unique words for meaningful clustering
        if len(unique_words) < 10:
            return {'clusters': [], 'message': 'Not enough unique words for clustering'}

        # Determine number of clusters
        if num_clusters is None:
            num_clusters = min(5, max(3, len(unique_words) // 15))

        try:
            # Create TF-IDF matrix for each unique word in context
            # Build mini-documents for each word showing its context
            word_contexts = []
            for word in unique_words:
                # Find sentences containing the word
                context_words = []
                word_indices = [i for i, w in enumerate(words) if w == word]
                for idx in word_indices[:5]:  # Use up to 5 contexts
                    # Get surrounding words (context window of 5)
                    start = max(0, idx - 5)
                    end = min(len(words), idx + 6)
                    context_words.extend(words[start:end])
                word_contexts.append(' '.join(context_words))

            # Create TF-IDF vectors
            vectorizer = TfidfVectorizer(max_features=50, stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(word_contexts)

            # Perform K-means clustering
            kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(tfidf_matrix)

            # Organize words into clusters
            clusters = []
            for cluster_id in range(num_clusters):
                cluster_word_indices = [i for i, label in enumerate(cluster_labels) if label == cluster_id]
                cluster_words = [unique_words[i] for i in cluster_word_indices]

                # Sort by frequency within cluster
                cluster_words_freq = [(w, word_freq[w]) for w in cluster_words]
                cluster_words_freq.sort(key=lambda x: x[1], reverse=True)

                clusters.append({
                    'cluster_id': cluster_id,
                    'words': [w for w, _ in cluster_words_freq[:10]],  # Top 10 words
                    'size': len(cluster_words)
                })

            return {'clusters': clusters, 'num_clusters': num_clusters}

        except Exception as e:
            logger.error(f"Clustering error: {str(e)}")
            return {'clusters': [], 'error': str(e)}
    
    def analyze_sensorimotor(self, words):
        """Analyze sensorimotor norms"""
        if self.lancaster_norms:
            try:
                return self.lancaster_norms.analyze_words(words)
            except Exception as e:
                logger.error(f"Sensorimotor analysis failed: {str(e)}")
                return {'error': 'Sensorimotor analysis unavailable'}
        else:
            return {'error': 'Lancaster norms not initialized'}
    
    def calculate_comprehensive_stats(self, text, tokens, words, sentences):
        """Calculate comprehensive text statistics including readability"""
        # FIX 1: Count only alphabetic words (exclude punctuation, numbers)
        # This gives accurate word count matching user expectations
        # Use regex to properly handle contractions AND hyphenated words
        import re
        # Match words including contractions (don't, It's) and hyphens (decision-making, twenty-one)
        # Pattern: word + optional repeating (hyphen/apostrophe + word)
        word_pattern = re.findall(r"\b[a-zA-Z]+(?:[-'][a-zA-Z]+)*\b", text)
        actual_words = word_pattern
        total_words = len(actual_words)

        # Use 'words' (without stopwords) for unique word count and diversity
        unique_words = len(set(actual_words))
        total_sentences = len(sentences)

        # Calculate syllables (approximation) - use actual words
        def count_syllables(word):
            word = word.lower()
            if len(word) == 0:
                return 0

            count = 0
            vowels = 'aeiou'
            previous_was_vowel = False

            # Count vowel groups
            for char in word:
                is_vowel = char in vowels
                if is_vowel and not previous_was_vowel:
                    count += 1
                previous_was_vowel = is_vowel

            # Handle silent 'e' at end, but with exceptions
            if word.endswith('e') and count > 1:
                # Don't subtract for words ending in 'le', 'es', 're', 'de', 'me', 'ne', 'te', 'se'
                # These usually have pronounced 'e' sounds
                if len(word) > 2 and word[-2:] in ['le', 'es', 'de', 're', 'me', 'ne', 'te', 'se']:
                    pass  # Keep the count as is
                elif len(word) > 3 and word[-3:] in ['ted', 'ced', 'ged', 'ate']:
                    pass  # Words like "created", "late" - 'e' is part of syllable
                else:
                    # Silent 'e' in words like "make", "time"
                    count -= 1

            # Minimum 1 syllable per word
            if count == 0:
                count = 1

            return count

        total_syllables = sum(count_syllables(word) for word in actual_words)

        # Readability scores
        # Flesch Reading Ease: 206.835 - 1.015(total words/total sentences) - 84.6(total syllables/total words)
        try:
            avg_sentence_length = total_words / total_sentences if total_sentences > 0 else 0
            avg_syllables_per_word = total_syllables / total_words if total_words > 0 else 0
            flesch_reading_ease = 206.835 - 1.015 * avg_sentence_length - 84.6 * avg_syllables_per_word
            flesch_reading_ease = max(0, min(100, flesch_reading_ease))  # Clamp between 0-100
        except:
            flesch_reading_ease = 50

        # Flesch-Kincaid Grade Level
        try:
            flesch_kincaid_grade = 0.39 * avg_sentence_length + 11.8 * avg_syllables_per_word - 15.59
            flesch_kincaid_grade = max(0, flesch_kincaid_grade)
        except:
            flesch_kincaid_grade = 8

        # Lexical diversity (Type-Token Ratio)
        lexical_diversity = (unique_words / total_words * 100) if total_words > 0 else 0

        # Average word length - use actual words
        avg_word_length = np.mean([len(word) for word in actual_words]) if actual_words else 0

        # Character count
        char_count = len(text)
        char_count_no_spaces = len(text.replace(' ', '').replace('\n', '').replace('\r', ''))

        # Word length distribution - use actual words
        word_lengths = [len(word) for word in actual_words]
        short_words = sum(1 for l in word_lengths if l <= 3)
        medium_words = sum(1 for l in word_lengths if 4 <= l <= 7)
        long_words = sum(1 for l in word_lengths if l >= 8)

        # FIX 2: Better paragraph counting
        # Try multiple methods to count paragraphs accurately
        import re

        # Split by multiple newlines (2 or more) to find formal paragraph breaks
        # This handles both \n\n and \n\n\n etc.
        paragraphs_double = len([p for p in re.split(r'\n\s*\n', text) if p.strip()])

        # Count all non-empty lines (for single-line breaks)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        paragraphs_single = len(lines)

        # Decision logic:
        # If we have multiple double-newline paragraphs, use that (formal documents)
        # Otherwise, use line count (user input with Enter key presses)
        if paragraphs_double > 1:
            paragraphs = paragraphs_double
        elif paragraphs_single > 0:
            paragraphs = paragraphs_single
        else:
            paragraphs = 1

        return {
            'total_words': total_words,
            'unique_words': unique_words,
            'sentences': total_sentences,
            'paragraphs': max(1, paragraphs),
            'characters': char_count,
            'characters_no_spaces': char_count_no_spaces,
            'avg_word_length': round(avg_word_length, 2),
            'avg_sentence_length': round(avg_sentence_length, 1),
            'lexical_diversity': round(lexical_diversity, 1),
            'flesch_reading_ease': round(flesch_reading_ease, 1),
            'flesch_kincaid_grade': round(flesch_kincaid_grade, 1),
            'readability_level': self.get_readability_level(flesch_reading_ease),
            'total_syllables': total_syllables,
            'avg_syllables_per_word': round(avg_syllables_per_word, 2),
            'word_distribution': {
                'short_words': short_words,
                'medium_words': medium_words,
                'long_words': long_words
            }
        }
    
    def get_readability_level(self, flesch_score):
        """Convert Flesch Reading Ease score to readability level"""
        if flesch_score >= 90:
            return 'Very Easy (5th grade)'
        elif flesch_score >= 80:
            return 'Easy (6th grade)'
        elif flesch_score >= 70:
            return 'Fairly Easy (7th grade)'
        elif flesch_score >= 60:
            return 'Standard (8th-9th grade)'
        elif flesch_score >= 50:
            return 'Fairly Difficult (10th-12th grade)'
        elif flesch_score >= 30:
            return 'Difficult (College)'
        else:
            return 'Very Difficult (College graduate)'
