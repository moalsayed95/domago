from typing import Any

from search_manager import SearchManager
from azure.core.credentials import AzureKeyCredential
from azure.identity import DefaultAzureCredential

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

_return_listing_id_schema = {
    "type": "function",
    "name": "return_listing_id",
    "description": "Return the 'id' of the listing the user is asking about ALWAYS use when the user asks a follow up question about a listing",
    "parameters": {
        "type": "object",
        "properties": {
            "id": {
                "type": "string",
                "description": "this is the id of the listing the user are asking about"
            }
        },
        "required": ["id"],
        "additionalProperties": False
    }
}

_zoom_in_or_out_schema = {
    "type": "function",
    "name": "zoom_in_or_out",
    "description": "Return 1 or -1 to zoom in or out of the map",
    "parameters": {
        "type": "object",
        "properties": {
            "zoom": {
                "type": "integer",
                "description": "the zoom level to zoom in or out"
            }
        },
        "required": ["zoom"],
        "additionalProperties": False
    }
}


_add_or_remove_from_favorites_schema = {
    "type": "function",
    "name": "add_or_remove_from_favorites",
    "description": "Add or remove a listing from the user's favorites by returning its id and the action",
    "parameters": {
        "type": "object",
        "properties": {
            "id": {
                "type": "string",
                "description": "the id of the listing to add or remove from favorites"
            },
            "action": {
                "type": "string",
                "description": "either 'add' or 'remove'",
                "enum": ["add", "remove"]
            }
        },
        "required": ["id", "action"],
        "additionalProperties": False
    }
}


_navigate_page_schema = {
    "type": "function",
    "name": "navigate_page",
    "description": "Return the page the user should navigate to. For example 'favorites' or 'main'",
    "parameters": {
        "type": "object",
        "properties": {
            "page": {
                "type": "string",
                "description": "The page to navigate to (e.g. 'favorites' or 'main')"
            }
        },
        "required": ["page"],
        "additionalProperties": False
    }
}

_send_message_schema = {
    "type": "function",
    "name": "send_message",
    "description": "Initiate a message to the owner of a listing",
    "parameters": {
        "type": "object",
        "properties": {
            "listing_id": {
                "type": "string",
                "description": "The ID of the listing whose owner we want to message"
            },
            "contact": {
                "type": "string",
                "description": "The contact information (email) of the listing owner"
            }
        },
        "required": ["listing_id", "contact"],
        "additionalProperties": False
    }
}

_update_preferences_schema = {
    "type": "function",
    "name": "update_preferences",
    "description": "Update the user's preferences for apartment search. Only include fields that were specifically mentioned by the user - other preferences will be preserved.",
    "parameters": {
        "type": "object",
        "properties": {
            "budget": {
                "type": "object",
                "properties": {
                    "min": {"type": "number"},
                    "max": {"type": "number"}
                }
            },
            "size": {
                "type": "object",
                "properties": {
                    "min": {"type": "number"},
                    "max": {"type": "number"}
                }
            },
            "rooms": {
                "type": "number",
                "description": "Desired number of rooms"
            },
            "location": {
                "type": "string",
                "description": "Preferred location/district in Vienna"
            },
            "features": {
                "type": "array",
                "items": {
                    "type": "string"
                },
                "description": "Special features like balcony, parking, etc. These will be added to existing features."
            }
        },
        "required": [],
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
            "availability": r.get("availability", ""),
            "lat": r.get("lat", 0.0),
            "lng": r.get("lng", 0.0),
        }
        listings.append(listing)

    # Return the listings list as JSON to the frontend
    return ToolResult({"listings": listings}, ToolResultDirection.TO_CLIENT)


async def _return_listing_id_tool( 
    args: Any
) -> ToolResult:
    # Return the listing id as JSON to the frontend
    return ToolResult({"id": args['id']}, ToolResultDirection.TO_CLIENT)

async def _zoom_in_or_out_tool( 
    args: Any
) -> ToolResult:
    # Return the zoom value (+1 or -1) as JSON to the frontend
    return ToolResult({"zoom": args['zoom']}, ToolResultDirection.TO_CLIENT)

async def _add_or_remove_from_favorites_tool(args: Any) -> ToolResult:
    return ToolResult({
        "favorite_id": args['id'],
        "favorite_action": args['action']
    }, ToolResultDirection.TO_CLIENT)


async def _navigate_page_tool(args: Any) -> ToolResult:
    # Return the requested page to navigate to
    return ToolResult({"navigate_to": args['page']}, ToolResultDirection.TO_CLIENT)

async def _send_message_tool(args: Any) -> ToolResult:
    return ToolResult({
        "action": "send_message",
        "listing_id": args['listing_id'],
        "contact": args['contact']
    }, ToolResultDirection.TO_CLIENT)

async def _update_preferences_tool(args: Any) -> ToolResult:
    return ToolResult({
        "action": "update_preferences",
        "preferences": args
    }, ToolResultDirection.TO_CLIENT)


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

    rtmt.tools["return_listing_id"] = Tool(
        schema=_return_listing_id_schema, 
        target=lambda args: _return_listing_id_tool(args)
    )

    rtmt.tools["zoom_in_or_out"] = Tool(
        schema=_zoom_in_or_out_schema, 
        target=lambda args: _zoom_in_or_out_tool(args)
    )

    rtmt.tools["add_or_remove_from_favorites"] = Tool(
        schema=_add_or_remove_from_favorites_schema,
        target=lambda args: _add_or_remove_from_favorites_tool(args)
    )

    rtmt.tools["navigate_page"] = Tool(
        schema=_navigate_page_schema,
        target=lambda args: _navigate_page_tool(args)
    )

    rtmt.tools["send_message"] = Tool(
        schema=_send_message_schema,
        target=lambda args: _send_message_tool(args)
    )

    rtmt.tools["update_preferences"] = Tool(
        schema=_update_preferences_schema,
        target=lambda args: _update_preferences_tool(args)
    )