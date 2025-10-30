"""
NeMo Guardrails integration for content filtering and safety.
Provides content moderation, input/output filtering, and safety guardrails.
"""
import os
import yaml
from typing import Dict, List, Optional, Any
from pathlib import Path

from nemoguardrails import LLMRails, RailsConfig
from nemoguardrails.integrations.langchain.runnable_rails import RunnableRails

from utils.logger import get_logger
from utils.config import get_settings

logger = get_logger(__name__)


class GuardrailsManager:
    """
    Manages NeMo Guardrails for content filtering and safety.
    """
    
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize GuardrailsManager.
        
        Args:
            config_path: Optional path to custom guardrails config directory
        """
        self.settings = get_settings()
        self.config_path = config_path or os.path.join(os.getcwd(), "config", "guardrails")
        self.rails = None
        self._ensure_config_exists()
        self._initialize_rails()
    
    def _ensure_config_exists(self):
        """Create default guardrails configuration if it doesn't exist."""
        config_dir = Path(self.config_path)
        config_dir.mkdir(parents=True, exist_ok=True)
        
        # Create config.yml if it doesn't exist
        config_file = config_dir / "config.yml"
        if not config_file.exists():
            self._create_default_config(config_file)
        
        # Create rails.co if it doesn't exist
        rails_file = config_dir / "rails.co"
        if not rails_file.exists():
            self._create_default_rails(rails_file)
    
    def _create_default_config(self, config_file: Path):
        """Create default configuration file."""
        default_config = {
            "models": [
                {
                    "type": "main",
                    "engine": "ollama",
                    "model": "llama2"  # Default model, can be overridden
                }
            ],
            "rails": {
                "input": {
                    "flows": ["block harmful input", "block off topic"]
                },
                "output": {
                    "flows": ["block harmful output", "block off topic output"]
                }
            },
            "streaming": True
        }
        
        with open(config_file, 'w', encoding='utf-8') as f:
            yaml.dump(default_config, f, default_flow_style=False)
        
        logger.info(f"Created default guardrails config at {config_file}")
    
    def _create_default_rails(self, rails_file: Path):
        """Create default rails configuration."""
        default_rails = '''# Default safety and content filtering rails

# Input filtering rails
define user ask harmful question
  "How to make explosives"
  "How to harm someone"
  "Generate illegal content"
  "Create malware"
  "Help with illegal activities"

define user ask off topic
  "What's the weather today"
  "Tell me about sports"
  "Random unrelated questions"

define bot explain cannot answer harmful
  "I cannot and will not provide information that could be used to harm others or engage in illegal activities."

define bot explain off topic
  "I'm focused on helping with your documents and knowledge base. Please ask questions related to your uploaded content."

# Input filtering flows
define flow block harmful input
  user ask harmful question
  bot explain cannot answer harmful
  stop

define flow block off topic
  user ask off topic
  bot explain off topic
  stop

# Output filtering rails
define bot response harmful output
  "Here's how to make explosives"
  "You can harm someone by"
  "Illegal activities include"
  "To create malware"

define bot response off topic output
  "The weather today"
  "Sports information"
  "Unrelated content"

define bot provide safe response
  "I can only provide safe and helpful information related to your documents."

# Output filtering flows
define flow block harmful output
  bot response harmful output
  bot provide safe response
  stop

define flow block off topic output
  bot response off topic output
  bot explain off topic
  stop

# Additional safety rails
define user ask personal info
  "What's your name"
  "Who created you"
  "What's your purpose"

define bot explain identity
  "I'm an AI assistant helping you with your document-based knowledge. I'm here to answer questions about your uploaded content."

define flow handle identity questions
  user ask personal info
  bot explain identity
'''
        
        with open(rails_file, 'w', encoding='utf-8') as f:
            f.write(default_rails)
        
        logger.info(f"Created default rails configuration at {rails_file}")
    
    def _initialize_rails(self):
        """Initialize the LLMRails instance."""
        try:
            # Check if config files exist
            config_file = Path(self.config_path) / "config.yml"
            rails_file = Path(self.config_path) / "rails.co"
            
            if not config_file.exists() or not rails_file.exists():
                logger.warning("Guardrails config files not found, creating defaults")
                self._ensure_config_exists()
            
            # Load configuration with error handling
            try:
                config = RailsConfig.from_path(self.config_path)
            except Exception as e:
                logger.warning(f"Failed to load RailsConfig: {e}, creating minimal config")
                # Create minimal in-memory config
                from nemoguardrails.rails.llm.config import Model
                
                config = RailsConfig(
                    models=[
                        Model(
                            type="main",
                            engine="ollama",
                            model="llama2"
                        )
                    ]
                )
            
            # Initialize with simplified config first
            self.rails = LLMRails(config)
            logger.info("NeMo Guardrails initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize NeMo Guardrails: {e}")
            logger.info("Guardrails will be disabled for this session")
            self.rails = None
    
    async def filter_input(self, user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Filter and validate user input.
        
        Args:
            user_input: The user's input text
            context: Optional context for the conversation
            
        Returns:
            Dict with filtered input and metadata
        """
        if not self.rails:
            # Fallback to simple keyword filtering if rails not available
            return self._simple_input_filter(user_input)
        
        try:
            # Use NeMo Guardrails to filter input
            response = await self.rails.generate_async(
                messages=[{"role": "user", "content": user_input}]
            )
            
            # Check if the input was blocked
            if response and "I cannot" in response.get("content", ""):
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": response.get("content", "Input blocked by safety filters"),
                    "original_input": user_input
                }
            
            return {
                "filtered_input": user_input,
                "allowed": True,
                "reason": None,
                "original_input": user_input
            }
            
        except Exception as e:
            logger.warning(f"Error in input filtering: {e}")
            # Fall back to simple filtering if rails fail
            return self._simple_input_filter(user_input)
    
    def _simple_input_filter(self, user_input: str) -> Dict[str, Any]:
        """Simple keyword-based input filtering as fallback."""
        
        # === BASIC HARMFUL CONTENT ===
        harmful_keywords = [
            "make explosives", "make bombs", "harm someone", "illegal activities",
            "create malware", "hack into", "break the law", "violence instructions"
        ]
        
        # === YOUR CUSTOM GUARDRAILS START HERE ===
        
        # Custom guardrail 1: Professional advice blocking
        professional_advice_keywords = [
            "medical diagnosis", "legal advice", "financial advice", "investment tips",
            "tax advice", "therapy", "counseling", "prescribe medication"
        ]
        
        # Custom guardrail 2: Personal information requests
        personal_info_keywords = [
            "password", "social security", "credit card", "personal details",
            "phone number", "home address", "private information"
        ]
        
        # Custom guardrail 3: Company confidential information
        company_confidential_keywords = [
            "internal documents", "company secrets", "employee data", 
            "proprietary information", "trade secrets", "confidential"
        ]
        
        # Custom guardrail 4: Academic dishonesty
        academic_dishonesty_keywords = [
            "do my homework", "write my essay", "cheat on exam", 
            "plagiarism help", "assignment answers"
        ]
        
        # Custom guardrail 5: Inappropriate content generation
        inappropriate_content_keywords = [
            "adult content", "sexual content", "discriminatory content",
            "hate speech", "offensive material"
        ]
        
        # === CHECKING LOGIC ===
        
        input_lower = user_input.lower()
        
        # Check harmful content
        for keyword in harmful_keywords:
            if keyword in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I cannot provide information that could be harmful or dangerous.",
                    "original_input": user_input
                }
        
        # Check professional advice
        for keyword in professional_advice_keywords:
            if keyword in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I cannot provide professional advice. Please consult qualified professionals.",
                    "original_input": user_input
                }
        
        # Check personal information requests
        for keyword in personal_info_keywords:
            if keyword in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I cannot help with personal information requests to protect privacy.",
                    "original_input": user_input
                }
        
        # Check company confidential information
        for keyword in company_confidential_keywords:
            if keyword in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I cannot share confidential company information.",
                    "original_input": user_input
                }
        
        # Check academic dishonesty
        for keyword in academic_dishonesty_keywords:
            if keyword in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I can help you learn, but I cannot assist with academic dishonesty.",
                    "original_input": user_input
                }
        
        # Check inappropriate content
        for keyword in inappropriate_content_keywords:
            if keyword in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I cannot generate inappropriate or offensive content.",
                    "original_input": user_input
                }
        
        # === ADD YOUR OWN CUSTOM CHECKS HERE ===
        
        # Example: Block certain file types or extensions
        file_extensions_to_block = [".exe", ".bat", ".cmd", ".vbs", ".js"]
        for ext in file_extensions_to_block:
            if ext in input_lower:
                return {
                    "filtered_input": "",
                    "allowed": False,
                    "reason": "I cannot help with potentially unsafe file types.",
                    "original_input": user_input
                }
        
        # Example: Block very long inputs (potential abuse)
        if len(user_input) > 5000:
            return {
                "filtered_input": "",
                "allowed": False,
                "reason": "Input is too long. Please keep messages under 5000 characters.",
                "original_input": user_input
            }
        
        # Example: Block empty or very short inputs
        if len(user_input.strip()) < 3:
            return {
                "filtered_input": "",
                "allowed": False,
                "reason": "Please provide a more specific question.",
                "original_input": user_input
            }
        
        # === YOUR CUSTOM GUARDRAILS END HERE ===
        
        # If all checks pass, allow the input
        return {
            "filtered_input": user_input,
            "allowed": True,
            "reason": None,
            "original_input": user_input
        }
    
    async def filter_output(self, output: str, user_input: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Filter and validate model output.
        
        Args:
            output: The model's generated output
            user_input: The original user input
            context: Optional context for the conversation
            
        Returns:
            Dict with filtered output and metadata
        """
        if not self.rails:
            # Fallback to simple keyword filtering if rails not available
            return self._simple_output_filter(output)
        
        try:
            # Check output using basic content filters
            return self._simple_output_filter(output)
            
        except Exception as e:
            logger.warning(f"Error in output filtering: {e}")
            # Fall back to simple filtering
            return self._simple_output_filter(output)
    
    def _simple_output_filter(self, output: str) -> Dict[str, Any]:
        """Simple keyword-based output filtering as fallback."""
        
        # === BASIC HARMFUL CONTENT ===
        harmful_keywords = [
            "make explosives", "harm someone", "illegal activities",
            "create malware", "violence", "weapons", "how to make bombs"
        ]
        
        # === YOUR CUSTOM OUTPUT GUARDRAILS START HERE ===
        
        # Custom output filter 1: Professional advice in responses
        professional_advice_patterns = [
            "i diagnose you with", "you should take medication", "legal advice",
            "financial recommendation", "investment strategy", "tax strategy"
        ]
        
        # Custom output filter 2: Personal information leakage
        personal_info_patterns = [
            "password is", "social security number", "credit card",
            "personal address", "phone number", "private information"
        ]
        
        # Custom output filter 3: Company confidential information
        confidential_patterns = [
            "company internal", "confidential data", "trade secret",
            "proprietary information", "employee personal data"
        ]
        
        # Custom output filter 4: Inappropriate content
        inappropriate_patterns = [
            "adult content", "sexual material", "discriminatory language",
            "hate speech", "offensive content"
        ]
        
        # === CHECKING LOGIC ===
        
        output_lower = output.lower()
        
        # Check harmful content
        for keyword in harmful_keywords:
            if keyword in output_lower:
                return {
                    "filtered_output": "I cannot provide information that could be harmful or dangerous.",
                    "allowed": False,
                    "reason": f"Output blocked due to harmful content: {keyword}",
                    "original_output": output
                }
        
        # Check professional advice
        for pattern in professional_advice_patterns:
            if pattern in output_lower:
                return {
                    "filtered_output": "I cannot provide professional advice. Please consult qualified professionals for specific guidance.",
                    "allowed": False,
                    "reason": f"Output blocked due to professional advice: {pattern}",
                    "original_output": output
                }
        
        # Check personal information leakage
        for pattern in personal_info_patterns:
            if pattern in output_lower:
                return {
                    "filtered_output": "I've removed sensitive information from my response to protect privacy.",
                    "allowed": False,
                    "reason": f"Output blocked due to personal information: {pattern}",
                    "original_output": output
                }
        
        # Check confidential information
        for pattern in confidential_patterns:
            if pattern in output_lower:
                return {
                    "filtered_output": "I cannot share confidential company information.",
                    "allowed": False,
                    "reason": f"Output blocked due to confidential content: {pattern}",
                    "original_output": output
                }
        
        # Check inappropriate content
        for pattern in inappropriate_patterns:
            if pattern in output_lower:
                return {
                    "filtered_output": "I cannot generate inappropriate or offensive content.",
                    "allowed": False,
                    "reason": f"Output blocked due to inappropriate content: {pattern}",
                    "original_output": output
                }
        
        # === ADD YOUR OWN CUSTOM OUTPUT CHECKS HERE ===
        
        # Example: Block outputs that are too short (potentially unhelpful)
        if len(output.strip()) < 10:
            return {
                "filtered_output": "Let me provide a more helpful response to your question.",
                "allowed": False,
                "reason": "Output too short, generating better response",
                "original_output": output
            }
        
        # Example: Block outputs with certain URLs or links
        suspicious_domains = ["malware.com", "phishing.net", "unsafe-site.org"]
        for domain in suspicious_domains:
            if domain in output_lower:
                return {
                    "filtered_output": "I've removed potentially unsafe links from my response.",
                    "allowed": False,
                    "reason": f"Output blocked due to suspicious link: {domain}",
                    "original_output": output
                }
        
        # === YOUR CUSTOM OUTPUT GUARDRAILS END HERE ===
        
        # If all checks pass, allow the output
        return {
            "filtered_output": output,
            "allowed": True,
            "reason": None,
            "original_output": output
        }
        for keyword in harmful_keywords:
            if keyword in output_lower:
                return {
                    "filtered_output": "I cannot provide information that could be harmful or used for illegal purposes. Please ask questions related to your documents.",
                    "allowed": False,
                    "reason": f"Output blocked due to harmful content: {keyword}",
                    "original_output": output
                }
        
        return {
            "filtered_output": output,
            "allowed": True,
            "reason": None,
            "original_output": output
        }
    
    def update_model_config(self, model_name: str):
        """
        Update the model configuration for guardrails.
        
        Args:
            model_name: Name of the Ollama model to use
        """
        if not self.rails:
            return
        
        try:
            # Update the model in the config
            if self.rails.config.models and len(self.rails.config.models) > 0:
                self.rails.config.models[0]["model"] = model_name
                logger.info(f"Updated guardrails model to: {model_name}")
        except Exception as e:
            logger.warning(f"Failed to update guardrails model config: {e}")
    
    def is_enabled(self) -> bool:
        """Check if guardrails are properly initialized and enabled."""
        return self.rails is not None
    
    async def generate_with_guardrails(
        self, 
        user_input: str, 
        model_name: str,
        context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Generate response with full guardrails pipeline.
        
        Args:
            user_input: User's input
            model_name: Model to use for generation
            context: Optional conversation context
            
        Returns:
            Dict with generated response and filtering results
        """
        try:
            # Filter input
            input_result = await self.filter_input(user_input, context)
            if not input_result["allowed"]:
                return {
                    "response": input_result["reason"],
                    "input_filtered": True,
                    "output_filtered": False,
                    "filtering_reason": input_result["reason"]
                }
            
            # For now, return a simple response since full generation
            # is handled by the main generate route
            return {
                "response": "Guardrails filtering passed, ready for generation",
                "input_filtered": False,
                "output_filtered": False,
                "filtering_reason": None
            }
            
        except Exception as e:
            logger.error(f"Error in guardrails generation: {e}")
            return {
                "response": "An error occurred while processing your request.",
                "input_filtered": False,
                "output_filtered": True,
                "error": str(e)
            }


# Global instance
_guardrails_manager = None

def get_guardrails_manager() -> GuardrailsManager:
    """Get the global GuardrailsManager instance."""
    global _guardrails_manager
    if _guardrails_manager is None:
        _guardrails_manager = GuardrailsManager()
    return _guardrails_manager