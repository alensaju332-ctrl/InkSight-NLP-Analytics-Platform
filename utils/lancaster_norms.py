import random

class LancasterNorms:
    """Basic Sensory Word Analyzer - counts words by sensory category"""

    def __init__(self):
        # Simplified sensorimotor categories with example words
        self.sensory_categories = {
            'visual': ['see', 'look', 'bright', 'color', 'light', 'dark', 'shine', 'view', 'watch', 'picture',
                      'vision', 'visible', 'appear', 'show', 'display', 'image', 'sight', 'glow', 'flash', 'sparkle',
                      'dim', 'illuminate', 'shadow', 'reflection', 'transparent', 'opaque', 'glossy', 'matte',
                      'vibrant', 'pale', 'vivid', 'dull', 'brilliant', 'radiant', 'luminous', 'clear', 'blur',
                      'focus', 'gaze', 'stare', 'glance', 'peer', 'observe', 'witness', 'spot', 'notice'],
            
            'auditory': ['hear', 'sound', 'loud', 'quiet', 'noise', 'music', 'voice', 'speak', 'listen', 'echo',
                        'whisper', 'shout', 'scream', 'murmur', 'hum', 'buzz', 'ring', 'chime', 'bell', 'siren',
                        'silence', 'mute', 'volume', 'pitch', 'tone', 'melody', 'rhythm', 'beat', 'harmony',
                        'discord', 'resonance', 'acoustic', 'audible', 'deafening', 'thunderous', 'rustle',
                        'clatter', 'bang', 'crash', 'thud', 'click', 'snap', 'crackle', 'pop', 'hiss'],
            
            'tactile': ['touch', 'feel', 'soft', 'hard', 'rough', 'smooth', 'warm', 'cold', 'texture', 'grip',
                       'pressure', 'squeeze', 'press', 'push', 'pull', 'stroke', 'pat', 'rub', 'scratch', 'tickle',
                       'wet', 'dry', 'moist', 'damp', 'sticky', 'slippery', 'fuzzy', 'silky', 'velvety', 'grainy',
                       'bumpy', 'flat', 'sharp', 'dull', 'pointed', 'rounded', 'heavy', 'light', 'weight',
                       'thick', 'thin', 'firm', 'flexible', 'rigid', 'elastic', 'brittle', 'tender', 'harsh'],
            
            'olfactory': ['smell', 'odor', 'scent', 'fragrance', 'aroma', 'stink', 'perfume', 'sniff', 'whiff',
                         'bouquet', 'essence', 'musk', 'floral', 'fruity', 'spicy', 'sweet', 'sour', 'bitter',
                         'pungent', 'acrid', 'fresh', 'stale', 'musty', 'fragrant', 'aromatic', 'odoriferous',
                         'redolent', 'fetid', 'putrid', 'rancid', 'smoky', 'burnt', 'earthy', 'woody', 'minty',
                         'lemony', 'vanilla', 'cinnamon', 'rose', 'lavender', 'jasmine', 'pine', 'ocean', 'rain'],
            
            'gustatory': ['taste', 'sweet', 'sour', 'bitter', 'salty', 'flavor', 'delicious', 'eat', 'food',
                         'savory', 'umami', 'spicy', 'bland', 'rich', 'mild', 'strong', 'zesty', 'tangy', 'tart',
                         'sugary', 'honeyed', 'syrupy', 'acidic', 'alkaline', 'metallic', 'nutty', 'buttery',
                         'creamy', 'crispy', 'crunchy', 'chewy', 'tender', 'tough', 'juicy', 'dry', 'moist',
                         'palate', 'tongue', 'mouth', 'chew', 'swallow', 'gulp', 'sip', 'nibble', 'devour'],
            
            'interoceptive': ['hungry', 'thirsty', 'tired', 'pain', 'ache', 'nausea', 'dizzy', 'breathless',
                             'heartbeat', 'pulse', 'fatigue', 'exhausted', 'energetic', 'vigorous', 'weak',
                             'comfortable', 'uncomfortable', 'relaxed', 'tense', 'anxious', 'calm', 'restless',
                             'sleepy', 'alert', 'drowsy', 'refreshed', 'sick', 'healthy', 'ill', 'well'],
            
            'motor': ['run', 'walk', 'jump', 'climb', 'crawl', 'dance', 'swim', 'fly', 'drive', 'ride',
                     'throw', 'catch', 'kick', 'hit', 'punch', 'grab', 'hold', 'lift', 'carry', 'drop',
                     'push', 'pull', 'twist', 'turn', 'bend', 'stretch', 'reach', 'grasp', 'release',
                     'move', 'motion', 'gesture', 'action', 'step', 'stride', 'leap', 'hop', 'skip']
        }
        
        # Create reverse mapping for faster lookup
        self.word_to_category = {}
        for category, words in self.sensory_categories.items():
            for word in words:
                self.word_to_category[word] = category
    
    def analyze_words(self, words):
        """Analyze sensory word distribution in text"""
        results = {category: 0 for category in self.sensory_categories}
        total_sensory_words = 0
        sensory_words_found = {category: [] for category in self.sensory_categories}

        # Convert words to lowercase for matching
        words_lower = [word.lower() for word in words]
        total_words = len(words_lower)

        # Count sensory words
        for word in words_lower:
            if word in self.word_to_category:
                category = self.word_to_category[word]
                results[category] += 1
                total_sensory_words += 1
                if len(sensory_words_found[category]) < 10:  # Store up to 10 examples
                    sensory_words_found[category].append(word)

        # Calculate word counts per category (NOT percentages of total sensory words)
        # This shows actual frequency in text
        if total_words > 0:
            # Find dominant modality
            dominant_modality = max(results.items(), key=lambda x: x[1])[0] if total_sensory_words > 0 else 'none'
        else:
            dominant_modality = 'none'

        # Calculate sensory density (sensory words per 100 words)
        sensory_density = (total_sensory_words / total_words * 100) if total_words else 0

        return {
            'raw_counts': results,  # Actual word counts per category
            'total_sensory_words': total_sensory_words,
            'dominant_modality': dominant_modality,
            'sensory_density': round(sensory_density, 2),
            'examples': sensory_words_found,
            'total_words_analyzed': total_words
        }
    
    def get_sensory_profile(self, words):
        """Get a detailed sensory profile with interpretation"""
        analysis = self.analyze_words(words)

        # Calculate percentages for profile analysis
        total = analysis['total_sensory_words']
        if total > 0:
            percentages = {cat: (count / total * 100) for cat, count in analysis['raw_counts'].items()}
        else:
            percentages = {cat: 0 for cat in analysis['raw_counts'].keys()}

        # Interpret the results
        profile = {
            'type': self._determine_writer_type(percentages),
            'strength': self._calculate_sensory_strength(analysis['sensory_density']),
            'balance': self._assess_balance(percentages),
            'recommendations': self._generate_recommendations(analysis, percentages)
        }

        return {**analysis, 'profile': profile}

    def _determine_writer_type(self, percentages):
        """Determine the writer's sensory preference type"""
        dominant = max(percentages.items(), key=lambda x: x[1])

        if dominant[1] > 40:
            return f"Strongly {dominant[0]}-oriented"
        elif dominant[1] > 25:
            return f"Moderately {dominant[0]}-oriented"
        else:
            return "Balanced sensory style"

    def _calculate_sensory_strength(self, density):
        """Calculate how sensory-rich the writing is"""
        if density > 10:
            return "Very high sensory content"
        elif density > 5:
            return "High sensory content"
        elif density > 2:
            return "Moderate sensory content"
        elif density > 0:
            return "Low sensory content"
        else:
            return "No sensory content detected"

    def _assess_balance(self, percentages):
        """Assess the balance of sensory modalities"""
        non_zero = [p for p in percentages.values() if p > 0]
        if len(non_zero) <= 1:
            return "Single modality focus"
        elif len(non_zero) == 2:
            return "Dual modality focus"
        elif len(non_zero) >= 5:
            return "Multi-sensory balanced"
        else:
            return "Limited sensory variety"

    def _generate_recommendations(self, analysis, percentages):
        """Generate writing recommendations based on analysis"""
        recommendations = []

        # Check for underused modalities
        for modality, percentage in percentages.items():
            if percentage == 0:
                recommendations.append(f"Consider adding {modality} descriptions to enrich your writing")

        # Check for overused modalities
        for modality, percentage in percentages.items():
            if percentage > 50:
                recommendations.append(f"Try balancing heavy {modality} content with other sensory modalities")

        # General recommendations based on density
        if analysis['sensory_density'] < 2:
            recommendations.append("Your writing could benefit from more sensory details overall")
        elif analysis['sensory_density'] > 15:
            recommendations.append("Consider whether all sensory details are necessary - sometimes less is more")

        if not recommendations:
            recommendations.append("Your sensory balance is good - keep up the varied sensory descriptions!")

        return recommendations