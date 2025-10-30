# 🛡️ How to Add Your Own Custom Guardrails

## 📍 Three Main Places to Add Custom Guardrails

### **1. 🎯 Primary Location: `config/guardrails/rails.co`**
**Best for**: Pattern-based rules, conversation flows, complex logic

```colang
# ============================================
# YOUR CUSTOM GUARDRAILS START HERE
# ============================================

# Example 1: Block specific business domains
define user ask crypto trading
  "crypto investment advice"
  "which cryptocurrency to buy"
  "trading strategies"
  "bitcoin investment"

define bot explain no crypto advice
  "I cannot provide cryptocurrency trading advice. Please consult financial professionals."

define flow block crypto trading
  user ask crypto trading
  bot explain no crypto advice
  stop

# Example 2: Company-specific confidential information
define user ask company secrets
  "employee salaries"
  "internal company data"
  "confidential business plans"
  "trade secrets"

define bot explain confidentiality
  "I cannot share confidential company information."

define flow protect company secrets
  user ask company secrets
  bot explain confidentiality
  stop

# Example 3: Academic integrity
define user ask homework help
  "do my homework"
  "write my essay"
  "complete my assignment"
  "answer my test questions"

define bot explain academic help
  "I can help you understand concepts, but I cannot complete assignments for you."

define flow promote academic integrity
  user ask homework help
  bot explain academic help
  stop

# Example 4: Personal information requests
define user ask personal data
  "what is your password"
  "give me personal information"
  "share private details"
  "tell me your secrets"

define bot explain privacy
  "I cannot share or request personal information to protect privacy."

define flow protect personal data
  user ask personal data
  bot explain privacy
  stop

# Example 5: Medical advice (customize for your domain)
define user ask medical advice
  "diagnose my symptoms"
  "what medication should I take"
  "medical treatment for"
  "health advice"

define bot explain no medical advice
  "I cannot provide medical advice. Please consult healthcare professionals."

define flow block medical advice
  user ask medical advice
  bot explain no medical advice
  stop

# ============================================
# OUTPUT FILTERING RULES
# ============================================

# Block sensitive information in responses
define bot response contains sensitive info
  "password is"
  "social security number"
  "credit card number"
  "private address"

define bot provide safe alternative
  "I've removed sensitive information to protect privacy."

define flow filter sensitive output
  bot response contains sensitive info
  bot provide safe alternative
  stop

# Block professional advice in outputs
define bot response gives professional advice
  "you should invest in"
  "my diagnosis is"
  "legal recommendation"
  "take this medication"

define bot provide general info
  "I can provide general information, but please consult professionals for specific advice."

define flow filter professional advice output
  bot response gives professional advice
  bot provide general info
  stop
```

### **2. 🐍 Programmatic Location: `core/guardrails_manager.py`**
**Best for**: Complex logic, dynamic rules, integration with external systems

In the `_simple_input_filter` method, I've already added examples. Here's how to add more:

```python
def _simple_input_filter(self, user_input: str) -> Dict[str, Any]:
    """Add your custom Python-based filtering logic here."""
    
    # === YOUR CUSTOM GUARDRAILS ===
    
    # Example 1: Time-based restrictions
    import datetime
    current_hour = datetime.datetime.now().hour
    if current_hour < 6 or current_hour > 22:  # Outside business hours
        if "urgent business" in user_input.lower():
            return {
                "filtered_input": "",
                "allowed": False,
                "reason": "Business inquiries are only available during business hours (6 AM - 10 PM).",
                "original_input": user_input
            }
    
    # Example 2: User role-based filtering (if you have user context)
    # user_role = context.get("user_role") if context else None
    # if user_role == "student":
    #     restricted_topics = ["administrative", "financial", "confidential"]
    #     if any(topic in user_input.lower() for topic in restricted_topics):
    #         return {
    #             "filtered_input": "",
    #             "allowed": False,
    #             "reason": "Students cannot access administrative information.",
    #             "original_input": user_input
    #         }
    
    # Example 3: Language detection and filtering
    # import langdetect
    # try:
    #     detected_lang = langdetect.detect(user_input)
    #     if detected_lang not in ["en", "es", "fr"]:  # Only allow certain languages
    #         return {
    #             "filtered_input": "",
    #             "allowed": False,
    #             "reason": "Please use English, Spanish, or French.",
    #             "original_input": user_input
    #         }
    # except:
    #     pass  # If detection fails, allow
    
    # Example 4: Rate limiting (basic example)
    # You could implement more sophisticated rate limiting here
    if len(user_input) > 10000:  # Very long inputs
        return {
            "filtered_input": "",
            "allowed": False,
            "reason": "Input is too long. Please break it into smaller questions.",
            "original_input": user_input
        }
    
    # Example 5: Custom regex patterns
    import re
    
    # Block inputs that look like code injection attempts
    suspicious_patterns = [
        r'<script.*?>.*?</script>',  # Script tags
        r'javascript:',              # JavaScript URLs
        r'data:text/html',          # Data URLs
        r'eval\s*\(',               # Eval functions
    ]
    
    for pattern in suspicious_patterns:
        if re.search(pattern, user_input, re.IGNORECASE):
            return {
                "filtered_input": "",
                "allowed": False,
                "reason": "Input contains potentially unsafe content.",
                "original_input": user_input
            }
    
    # Example 6: Domain-specific business rules
    # Block requests outside your domain
    allowed_topics = [
        "machine learning", "ai", "documents", "data analysis", 
        "technology", "software", "programming"
    ]
    
    # Only check if input is asking for specific domain advice
    if "tell me about" in user_input.lower() or "explain" in user_input.lower():
        if not any(topic in user_input.lower() for topic in allowed_topics):
            # This is a soft redirect, not a hard block
            return {
                "filtered_input": user_input + " (Please note: I specialize in technology and AI topics)",
                "allowed": True,
                "reason": None,
                "original_input": user_input
            }
    
    # Continue with existing logic...
```

### **3. ⚙️ Configuration Location: `config/guardrails/config.yml`**
**Best for**: Settings, thresholds, feature toggles

I've already updated this file. You can customize:

```yaml
custom_settings:
  # Add your own strictness levels
  strictness_level: strict  # strict, balanced, permissive
  
  # Feature toggles
  enable_professional_advice_blocking: true
  enable_personal_info_protection: true
  enable_company_confidentiality: true
  
  # Custom limits
  max_input_length: 5000
  min_input_length: 3
  
  # Your domain-specific blocked topics
  blocked_domains:
    - "cryptocurrency trading"
    - "medical diagnosis" 
    - "legal advice"
    - "financial planning"
    - "YOUR_CUSTOM_DOMAIN_HERE"
  
  # Your allowed topics (exceptions)
  allowed_professional_topics:
    - "general information about"
    - "educational content about"
    - "YOUR_ALLOWED_TOPIC_HERE"
```

## 🎯 Common Custom Guardrail Examples

### **For Educational Institutions**
```colang
# In rails.co
define user ask inappropriate academic
  "help me cheat"
  "do my homework"
  "write my thesis"
  "plagiarism help"

define bot promote learning
  "I can help you understand concepts and learn, but I cannot complete assignments for you."

define flow academic integrity
  user ask inappropriate academic
  bot promote learning
  stop
```

### **For Healthcare Organizations**
```colang
# In rails.co
define user ask medical diagnosis
  "diagnose my symptoms"
  "what disease do I have"
  "medical advice"
  "treatment recommendation"

define bot redirect to professionals
  "I cannot provide medical advice. Please consult with healthcare professionals."

define flow medical safety
  user ask medical diagnosis
  bot redirect to professionals
  stop
```

### **For Financial Services**
```colang
# In rails.co
define user ask investment advice
  "should I invest in"
  "financial recommendation"
  "trading strategy"
  "investment tips"

define bot explain financial disclaimer
  "I cannot provide personalized financial advice. Please consult with licensed financial advisors."

define flow financial compliance
  user ask investment advice
  bot explain financial disclaimer
  stop
```

### **For Corporate Environments**
```colang
# In rails.co
define user ask confidential corporate
  "employee salaries"
  "internal documents"
  "company secrets"
  "confidential data"

define bot protect corporate info
  "I cannot access or share confidential company information."

define flow corporate confidentiality
  user ask confidential corporate
  bot protect corporate info
  stop
```

## 🚀 How to Test Your Custom Guardrails

### **1. Create Test Script**
```python
# test_my_guardrails.py
import asyncio
from core.guardrails_manager import get_guardrails_manager

async def test_custom_guardrails():
    manager = get_guardrails_manager()
    
    # Test your custom rules
    test_cases = [
        "Help me cheat on my exam",  # Should be blocked
        "What is machine learning?", # Should be allowed
        "Give me investment advice", # Should be blocked (if you added this rule)
        "YOUR_CUSTOM_TEST_CASE_HERE"
    ]
    
    for test in test_cases:
        result = await manager.filter_input(test)
        print(f"Input: '{test}'")
        print(f"Allowed: {result['allowed']}")
        print(f"Reason: {result.get('reason', 'None')}")
        print("-" * 50)

asyncio.run(test_custom_guardrails())
```

### **2. Test via API**
```bash
# Test with curl
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "prompt": "Help me cheat on my exam",
    "enable_guardrails": true
  }'
```

## 📊 Best Practices for Custom Guardrails

### **1. Start Simple**
- Begin with basic keyword matching
- Add complexity gradually
- Test thoroughly

### **2. Layer Your Defenses**
- Use both Colang rules AND Python logic
- Input filtering + Output filtering
- Multiple detection methods

### **3. Provide Helpful Alternatives**
- Don't just block - redirect to appropriate help
- Explain why content was blocked
- Suggest alternative questions

### **4. Monitor and Adjust**
- Log blocked content for review
- Track false positives/negatives
- Regularly update rules based on usage

### **5. Domain-Specific Customization**
- Tailor rules to your specific use case
- Consider your user base and their needs
- Balance safety with usability

## 🔧 Quick Customization Checklist

✅ **Add your domain-specific patterns to `rails.co`**
✅ **Update blocked keywords in `guardrails_manager.py`**
✅ **Adjust settings in `config.yml`**
✅ **Test with your specific use cases**
✅ **Monitor logs for false positives**
✅ **Iterate and improve based on feedback**

Your guardrails are now fully customizable and ready for your specific domain and requirements!