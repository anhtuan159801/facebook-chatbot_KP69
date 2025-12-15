"""
This module provides client functions to interact with external APIs for
embedding, chat completion, and vision tasks.
"""
import base64
import httpx
from raganything.config import RAGAnythingConfig

# Initialize config to be used by the functions in this module
config = RAGAnythingConfig()

async def get_embedding_from_api(text: str) -> list[float]:
    """
    Calls an embedding API to get the vector embedding for a given text.
    """
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config.embedding_api_url,
                headers={
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "input": text,
                    "model": config.embedding_model_name,
                },
                timeout=30,
            )
            response.raise_for_status()
            embedding = response.json()["data"][0]["embedding"]
            return embedding
        except httpx.HTTPStatusError as e:
            print(f"Error calling embedding API: {e}")
            print(f"Response body: {e.response.text}")
            raise
        except Exception as e:
            print(f"An unexpected error occurred in get_embedding_from_api: {e}")
            raise

async def get_llm_answer_from_api(context_str: str, query_str: str) -> str:
    """
    Calls a chat completion API to generate an answer based on context and a query.
    """
    prompt = f"""
    Use the following context to answer the user's question accurately and in detail.
    
    Context:
    ---
    {context_str}
    ---
    
    Question: {query_str}
    
    Answer:
    """
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config.chat_api_url,
                headers={
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": config.chat_model_name,
                    "messages": [
                        {"role": "system", "content": "You are a helpful AI assistant."},
                        {"role": "user", "content": prompt}
                    ],
                },
                timeout=120,
            )
            response.raise_for_status()
            answer = response.json()["choices"][0]["message"]["content"]
            return answer
        except httpx.HTTPStatusError as e:
            print(f"Error calling chat API: {e}")
            print(f"Response body: {e.response.text}")
            raise
        except Exception as e:
            print(f"An unexpected error occurred in get_llm_answer_from_api: {e}")
            raise

async def get_vision_answer_from_api(**kwargs) -> str:
    """
    Calls a vision-capable API. Handles two scenarios:
    1. Describing an image for indexing: kwargs contain 'image_path' and 'context'.
    2. Answering a query with image context: kwargs contain 'context_str', 'query_str', 'images'.
    """
    messages = []
    
    if "image_path" in kwargs:
        image_path = kwargs["image_path"]
        context = kwargs.get("context", "")
        
        try:
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        except FileNotFoundError:
            return f"Error: Image file not found at {image_path}"

        messages = [{
            "role": "user",
            "content": [
                {"type": "text", "text": f"Based on the surrounding text and this image, create a detailed and rich description of the image. Context: {context}"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
            ]
        }]
    
    elif "images" in kwargs:
        context_str = kwargs.get("context_str", "")
        query_str = kwargs.get("query_str", "")
        base64_images = kwargs.get("images", [])
        
        content = [{"type": "text", "text": f"Based on the context and the following image(s), answer the question: {query_str}\nContext: {context_str}"}]
        for b64_img in base64_images:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}})
        
        messages = [{"role": "user", "content": content}]
        
    else:
        return "Error: Invalid parameters for vision API call."

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                config.vision_api_url,
                headers={
                    "Authorization": f"Bearer {config.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": config.vision_model_name,
                    "messages": messages,
                    "max_tokens": 2048,
                },
                timeout=180,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            print(f"Error calling vision API: {e}")
            print(f"Response body: {e.response.text}")
            raise
        except Exception as e:
            print(f"An unexpected error occurred in get_vision_answer_from_api: {e}")
            raise
