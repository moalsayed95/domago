import os
import dotenv
import asyncio
from typing import List, Dict, Any

from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes.aio import SearchIndexClient
from azure.search.documents.aio import SearchClient
from azure.search.documents.indexes.models import (
    AzureOpenAIParameters,
    AzureOpenAIVectorizer,
    HnswAlgorithmConfiguration,
    HnswParameters,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)

dotenv.load_dotenv(override=True)

class IndexManager:
    def __init__(
        self,
        service_name: str,
        api_key: str,
        embedding_model: str,
        endpoint_env_var="AZURE_SEARCH_SERVICE",
        index_name="flat-index",
        embedding_dimensions=3072,
        use_int_vectorization=True
    ):
        self.index_name = index_name
        self.embedding_model = embedding_model
        self.embedding_dimensions = embedding_dimensions
        self.use_int_vectorization = use_int_vectorization

        self.azure_search_endpoint = f"https://{service_name}.search.windows.net"
        self.azure_search_credential = AzureKeyCredential(api_key)
        self.search_index_client = SearchIndexClient(
            endpoint=self.azure_search_endpoint,
            credential=self.azure_search_credential
        )

        # OpenAI client for embedding
        self.azure_openai_client = AzureOpenAI(
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_endpoint=os.getenv("AZURE_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY")
        )

        self.index = self._build_index()

    def _build_index(self) -> SearchIndex:
        fields = [
            (
                SimpleField(name="id", type="Edm.String", key=True)
                if not self.use_int_vectorization
                else SearchField(
                    name="id",
                    type="Edm.String",
                    key=True,
                    sortable=True,
                    filterable=True,
                    facetable=True,
                    analyzer_name="keyword",
                )
            ),
            SearchableField(
                name="title",
                type="Edm.String"
            ),
            SearchableField(
                name="description",
                type="Edm.String",
                analyzer_name=None,
            ),
            SimpleField(name="location", type="Edm.String", filterable=True, facetable=True, searchable=True),
            SimpleField(name="contact", type="Edm.String", filterable=True, facetable=True, searchable=True),
            SimpleField(name="price", type="Edm.Double", filterable=True, facetable=True),
            SimpleField(name="rooms", type="Edm.Int32", filterable=True, facetable=True),
            SimpleField(name="size", type="Edm.Int32", filterable=True, facetable=True),
            SimpleField(name="floor", type="Edm.Int32", filterable=True, facetable=True),
            SimpleField(name="built_year", type="Edm.Int32", filterable=True, facetable=True),
            SimpleField(name="furnished", type="Edm.Boolean", filterable=True, facetable=True),
            SimpleField(name="availability", type="Edm.String", filterable=True, facetable=False),
            SimpleField(name="pets_allowed", type="Edm.Boolean", filterable=True, facetable=True),
            SimpleField(name="lat", type="Edm.Double", filterable=True, facetable=True),
            SimpleField(name="lng", type="Edm.Double", filterable=True, facetable=True),
            SimpleField(name="elevator", type="Edm.Boolean", filterable=True, facetable=True),
            SimpleField(name="balcony", type="Edm.Boolean", filterable=True, facetable=True),
            SimpleField(name="smoking_allowed", type="Edm.Boolean", filterable=True, facetable=True),
            SimpleField(name="deposit", type="Edm.Double", filterable=True, facetable=True),

            # Embedding vector field
            SearchField(
                name="embedding",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                hidden=False,
                searchable=True,
                filterable=False,
                sortable=False,
                facetable=False,
                vector_search_dimensions=self.embedding_dimensions,
                vector_search_profile_name="embedding_config",
            ),
        ]

        vectorizers = [
            AzureOpenAIVectorizer(
                name=f"{self.index_name}-vectorizer",
                kind="azureOpenAI",
                azure_open_ai_parameters=AzureOpenAIParameters(
                    resource_uri=os.getenv("AZURE_OPENAI_ENDPOINT"),
                    deployment_id=self.embedding_model,
                    model_name=self.embedding_model,
                    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                ),
            )
        ]

        index = SearchIndex(
            name=self.index_name,
            fields=fields,
            semantic_search=SemanticSearch(
                configurations=[
                    SemanticConfiguration(
                        name="default",
                        prioritized_fields=SemanticPrioritizedFields(
                            title_field=SemanticField(field_name="title"),
                            content_fields=[SemanticField(field_name="description")]
                        ),
                    )
                ]
            ),
            vector_search=VectorSearch(
                algorithms=[
                    HnswAlgorithmConfiguration(
                        name="hnsw_config",
                        parameters=HnswParameters(metric="cosine"),
                    )
                ],
                profiles=[
                    VectorSearchProfile(
                        name="embedding_config",
                        algorithm_configuration_name="hnsw_config",
                        vectorizer=(f"{self.index_name}-vectorizer" if self.use_int_vectorization else None),
                    ),
                ],
                vectorizers=vectorizers,
            ),
        )
        return index

    async def create_index_if_not_exists(self):
        existing_indexes = [idx.name async for idx in self.search_index_client.list_indexes()]
        if self.index_name not in existing_indexes:
            await self.search_index_client.create_index(self.index)
            print(f"Index '{self.index_name}' created successfully.")
        else:
            print(f"Index '{self.index_name}' already exists.")

    def _calculate_embedding(self, text: str) -> List[float]:
        response = self.azure_openai_client.embeddings.create(input=text, model=self.embedding_model)
        return response.data[0].embedding

    async def upload_documents(self, documents: List[Dict[str, Any]]):
        # Calculate embeddings for each document
        for doc in documents:
            # You can decide what field(s) to use for embeddings. Here we use 'description' + 'title'
            combined_text = f"{doc.get('title', '')} {doc.get('description', '')}".strip()
            doc["embedding"] = self._calculate_embedding(combined_text)

        search_client = SearchClient(
            endpoint=self.azure_search_endpoint,
            index_name=self.index_name,
            credential=self.azure_search_credential
        )
        result = await search_client.upload_documents(documents=documents)
        print("Documents uploaded successfully:", result)


if __name__ == "__main__":
    service_name = os.getenv("AZURE_SEARCH_SERVICE_NAME")
    api_key = os.getenv("AZURE_SEARCH_API_KEY")
    embedding_model = "text-embedding-3-large"
    AZURE_SEARCH_INDEX = os.getenv("AZURE_SEARCH_INDEX")

    index_manager = IndexManager(
        service_name=service_name,
        api_key=api_key,
        embedding_model=embedding_model,
        index_name=AZURE_SEARCH_INDEX
        )
    asyncio.run(index_manager.create_index_if_not_exists())
    # read the documents in data/dlat_data.json
    import json
    with open("data/flat_data.json", "r") as f:
        documents = json.load(f)

    asyncio.run(index_manager.upload_documents(documents))