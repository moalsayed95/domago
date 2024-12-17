import re
from typing import Any
import os

from search_manager import SearchManager
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential
from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorizableTextQuery

from rtmt import RTMiddleTier, Tool, ToolResult, ToolResultDirection

_search_tool_schema = {
    "type": "function",
    "name": "search",
    "description": "Search the knowledge base for flat listings. The knowlege base will be searched for the query and the results will be returned  ",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query"
            }
        },
        "required": ["query"],
        "additionalProperties": False
    }
}


async def _search_tool(
    search_manager, 
    args: Any
) -> ToolResult:
    print(f"Searching for '{args['query']}' in the knowledge base.")
    # Use the SearchManager to get vector-based search results
    results = await search_manager.search_by_embedding(args['query'], k=5)

    listings = []
    for r in results:
        # Extract listing details from the search result. These field names must match your index schema.
        listing = {
            "id": r.get("id", "unknown_id"),
            "title": r.get("title", ""),
            "description": r.get("description", ""),
            "location": r.get("location", ""),
            "price": r.get("price", 0.0),
            "contact": r.get("contact", ""),
            "rooms": r.get("rooms", 0),
            "size": r.get("size", 0),
            "floor": r.get("floor", 0),
            "availability": r.get("available_from", ""),
            "lat": r.get("lat", 0.0),
            "lng": r.get("lng", 0.0),
        }
        listings.append(listing)

    # Return the listings as JSON to the frontend
    return ToolResult({"listings": listings}, ToolResultDirection.TO_CLIENT)



def attach_rag_tools(rtmt: RTMiddleTier,
    credentials: AzureKeyCredential | DefaultAzureCredential,
    search_manager: SearchManager, 
    ) -> None:
    if not isinstance(credentials, AzureKeyCredential):
        credentials.get_token("https://search.azure.com/.default") # warm this up before we start getting requests

    

    rtmt.tools["search"] = Tool(
        schema=_search_tool_schema, 
        target=lambda args: _search_tool(search_manager, args)
    )
    # rtmt.tools["report_grounding"] = Tool(schema=_grounding_tool_schema, target=lambda args: _report_grounding_tool(search_client, identifier_field, title_field, content_field, args))
