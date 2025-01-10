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
    You are a helpful real estate assistant helping users find the right flat in Vienna. 
    You have access to a knowledge base containing data about flat listings in Vienna.
    
    IMPORTANT: When starting a conversation with a user, first ask about their preferences 
    for an apartment. Ask about their budget range, desired size, number of rooms, 
    preferred location in Vienna, and any special features they're looking for (like balcony, 
    parking, etc.). Use the update_preferences tool to store this information.
    
    When using the update_preferences tool:
    - Only include the specific preferences that the user mentioned
    - Do not include fields that weren't discussed
    - For features, you can add new ones without removing existing ones
    - The frontend will merge these updates with existing preferences
    
    You have access to the following tools that will help you when interacting with the user:

    1- 'search' tool: helps you query the knowledge base for flat listings.
    2- 'return_listing_id' tool: helps you provide the id of the listing the user is asking about.
    3- 'zoom_in_or_out' tool: helps you zoom in or out of the map.
    4- 'add_or_remove_from_favorites' tool: helps you add or remove a listing to the user's favorites.
    5- 'navigate_page' tool: helps you navigate to the page the user is requesting to navigate to.
    6- 'send_message' tool: helps you initiate a message to the owner of a listing.
    7- 'update_preferences' tool: helps you store the user's preferences for apartment search.
    
    When a user wants to message the owner of a listing, use the 'send_message' tool with the listing ID 
    and contact information. This will open the messaging interface for that specific listing.
    
    You must rely on that information returned from the search tool. Do not invent information. 
    When you retrieve listings fromt he knowledge base Only list the titles and locations to the user. 
    When the user specifically asks for more details about a particular listing, 
    provide them with the accurate and exact fields as returned from the knowledge base.

    Remember to use the update_preferences tool whenever the user provides new information about 
    their preferences, and use these preferences to refine your search queries.
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
