import logging
import os
from pathlib import Path

from aiohttp import web
from azure.core.credentials import AzureKeyCredential
from azure.identity import AzureDeveloperCliCredential, DefaultAzureCredential
from dotenv import load_dotenv

from ragtools import attach_rag_tools
from rtmt import RTMiddleTier

from search_manager import SearchManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("voicerag")

async def create_app():
    if not os.environ.get("RUNNING_IN_PRODUCTION"):
        logger.info("Running in development mode, loading from .env file")
        load_dotenv()

    llm_key = os.environ.get("AZURE_OPENAI_API_KEY")
    search_key = os.environ.get("AZURE_SEARCH_API_KEY")

    credential = None
    if not llm_key or not search_key:
        if tenant_id := os.environ.get("AZURE_TENANT_ID"):
            logger.info("Using AzureDeveloperCliCredential with tenant_id %s", tenant_id)
            credential = AzureDeveloperCliCredential(tenant_id=tenant_id, process_timeout=60)
        else:
            logger.info("Using DefaultAzureCredential")
            credential = DefaultAzureCredential()
    llm_credential = AzureKeyCredential(llm_key) if llm_key else credential
    search_credential = AzureKeyCredential(search_key) if search_key else credential
    
    app = web.Application()

    rtmt = RTMiddleTier(
        credentials=llm_credential,
        endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        deployment=os.environ["AZURE_OPENAI_REALTIME_DEPLOYMENT"],
        voice_choice=os.environ.get("AZURE_OPENAI_REALTIME_VOICE_CHOICE") or "alloy"
        )
    rtmt.temperature = 0.6
    rtmt.max_tokens = 1000
    rtmt.system_message = """
    You are a helpful assistant helping users find the right flat in Vienna. 
    You have access to a knowledge base containing data about flat listings in Vienna.
    When helping users find the correct flat suitable for them, always use the 'search' tool to 
    help you query the knowledge base before answering a question related to the listings.

    The search results will contain listings and each one has the following information associated with it:

    You must rely on that information returned from the search tool. Initially, start by reading the titles. 
    When the user specifically asks for more details about a particular listing, provide the exact fields from the stored data.
    You must only use the listing data provided in the instructions. Do not invent data. 
    If the user requests details about a listing, refer to the exact fields from the provided JSON data of previously returned listings.
    Speak English as the main language and for German words like street names or other German words, use a German accent.
    """
    search_manager = SearchManager(
        service_name=os.getenv("AZURE_SEARCH_SERVICE_NAME"),
        api_key=os.getenv("AZURE_SEARCH_API_KEY"),
        index_name=os.getenv("AZURE_SEARCH_INDEX"),
        embedding_model="text-embedding-3-large"
    )

    attach_rag_tools(rtmt, credentials=search_credential, search_manager=search_manager)
    rtmt.attach_to_app(app, "/realtime")

    current_directory = Path(__file__).parent
    app.add_routes([web.get('/', lambda _: web.FileResponse(current_directory / 'static/index.html'))])
    app.router.add_static('/', path=current_directory / 'static', name='static')
    
    return app

if __name__ == "__main__":
    host = "localhost"
    port = 8765
    web.run_app(create_app(), host=host, port=port)
