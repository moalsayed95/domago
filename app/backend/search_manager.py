import os
import dotenv
import asyncio
from typing import List, Dict, Any, Optional

from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizedQuery

dotenv.load_dotenv(override=True)

class SearchManager:
    def __init__(
        self,
        service_name: str,
        api_key: str,
        index_name: str,
        embedding_model: str,
        endpoint_env_var="AZURE_SEARCH_SERVICE"
    ):
        self.index_name = index_name
        self.embedding_model = embedding_model
        self.azure_search_endpoint = f"https://{service_name}.search.windows.net"
        self.azure_search_credential = AzureKeyCredential(api_key)

        self.search_client = SearchClient(
            endpoint=self.azure_search_endpoint,
            index_name=self.index_name,
            credential=self.azure_search_credential
        )

        self.azure_openai_client = AzureOpenAI(
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY")
        )

    def _calculate_embedding(self, text: str) -> List[float]:
        response = self.azure_openai_client.embeddings.create(input=text, model=self.embedding_model)
        return response.data[0].embedding

    async def search_by_embedding(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        query_embedding = self._calculate_embedding(query)
        vector_query = VectorizedQuery(
            kind="vector",
            vector=query_embedding,
            fields="embedding",
            k_nearest_neighbors=k,
            exhaustive=False
        )

        results = await self.search_client.search(vector_queries=[vector_query])
        output = []
        async for page in results.by_page():
            async for doc in page:
                output.append(doc)
        return output

    async def search_by_filters(
        self,
        location: Optional[str] = None,
        max_price: Optional[float] = None,
        min_rooms: Optional[int] = None,
        furnished: Optional[bool] = None,
        pet_friendly: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        # Construct OData filter string
        filters = []
        if location:
            filters.append(f"search.in(location, '{location}', ',')")
        if max_price is not None:
            filters.append(f"price le {max_price}")
        if min_rooms is not None:
            filters.append(f"rooms ge {min_rooms}")
        if furnished is not None:
            filters.append(f"furnished eq {str(furnished).lower()}")
        if pet_friendly is not None:
            filters.append(f"pet_friendly eq {str(pet_friendly).lower()}")

        filter_str = " and ".join(filters) if filters else None

        results = await self.search_client.search(
            search_text="",
            filter=filter_str,
            query_type="simple",
            top=50
        )
        output = []
        async for page in results.by_page():
            async for doc in page:
                output.append(doc)
        return output

    async def search_with_vector_and_filters(
        self,
        text_query: str,
        k: int = 3,
        location: Optional[str] = None,
        max_price: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        query_embedding = self._calculate_embedding(text_query)
        # Construct OData filter string
        filters = []
        if location:
            filters.append(f"location eq '{location}'")
        if max_price is not None:
            filters.append(f"price le {max_price}")

        filter_str = " and ".join(filters) if filters else None

        vector_query = VectorizedQuery(
            kind="vector",
            vector=query_embedding,
            fields="embedding",
            k_nearest_neighbors=k,
            filter=filter_str,
            vector_filter_mode="pre"  # or "post" depending on your requirement
        )

        results = await self.search_client.search(vector_queries=[vector_query])
        output = []
        async for page in results.by_page():
            async for doc in page:
                output.append(doc)
        return output

if __name__ == "__main__":

    search_manager = SearchManager(
        service_name=os.getenv("AZURE_SEARCH_SERVICE_NAME"),
        api_key=os.getenv("AZURE_SEARCH_API_KEY"),
        index_name=os.getenv("AZURE_SEARCH_INDEX"),
        embedding_model="text-embedding-3-large"
    )
    results = asyncio.run(search_manager.search_by_embedding("stlyiii", k=5))
    for r in results:
        print(r["title"])
        print(r["description"])
        print(r["location"])

