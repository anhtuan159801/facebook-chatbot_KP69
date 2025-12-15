"""
This module defines custom Embedder classes for RAG-Anything.
"""
from lightrag.core import Embedder
from raganything.api_clients import get_embedding_from_api
from raganything.config import RAGAnythingConfig

# Initialize config to be used by the classes in this module
config = RAGAnythingConfig()

class APIEmbedder(Embedder):
    """
    An Embedder that uses an external API for generating vector embeddings.
    """
    def __init__(self):
        """
        Initializes the APIEmbedder.
        The dimension is fetched from the global config.
        """
        super().__init__(model_name="api_based_embedder", dimension=config.embedding_dimension)
    
    async def embed(self, text: str, **kwargs) -> list[float]:
        """
        Calls the API function to get the embedding for the given text.
        """
        return await get_embedding_from_api(text)

    def _to_json(self):
        """
        Serializes the Embedder's configuration.
        This is required by LightRAG for saving and loading the index.
        """
        return {
            "model_name": self.model_name,
            "dimension": self.dimension,
            # Add a class identifier for correct deserialization
            "__classname__": self.__class__.__name__ 
        }

    @classmethod
    def from_dict(cls, a_dict: dict):
        """
        Deserializes the Embedder from a dictionary.
        This allows LightRAG to reconstruct the correct Embedder object.
        """
        return cls()

