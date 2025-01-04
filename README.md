# domago

An interactive way to search flats in Vienna using Microsoft AI services.

## Screenshot

![Screenshot of domago](ui/v1.png)

## Pre-requisites

Clicking on button bellow will redirect you to the Azure portal to deploy the resources necessary to conduct this demo using the ARM template provided in this repository.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fmoalsayed95%2Fdomago%2Fms%2Fiac%2Fazuredeploy.json)

This script will create the following resources: Azure AI Search, Azure Cosmos DB, Storage Account, Azure Maps Account, Azure OpenAI Service (with the deployments of `gpt-4o-realtime-preview` and `text-embedding-3-large`)


## Development Environment

GitHub Codespaces is a cloud-based development environment that allows you to code from anywhere. It provides a fully configured environment that can be launched directly from any GitHub repository, saving you from lengthy setup times. You can access Codespaces from your browser, Visual Studio Code, or the GitHub CLI, making it easy to work from virtually any device.

To open GitHub Codespaces, click on the button below:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/)

Please select your forked repository from the dropdown and choose `default_environment (Python 3.11)` as your default codespace configuration


## Setup
1. Clone the repository.

```bash	
git clone https://github.com/moalsayed95/domago.git
```

2. Create the Azure Services listed above.

3. in the root directory of the backend project, use `.env.template` and rename it to `.env` and fill the env variables with the values from your Azure resources. In addition, in the root directory of the frontend project, use `.env.template` and rename it to `.env` and fill the env variables with the values from your Azure resources.

4. Create the AI search Index and index the dummy data from the `data` folder. The data folder has the flats data in JSON format `data/flat_cata.json`. You can do this by running the `index_manager.py` script in the backend project.

Example Data:  
```json
{
    "id": "1",
    "title": "Cozy Studio in City Center",
    "description": "A cozy studio apartment located in the heart of Vienna, just steps from Stephansplatz. Ideal for professionals or students seeking a central location.",
    "location": "Innere Stadt",
    "lat": 48.2082,
    "lng": 16.3738,
    "contact": "studio.central@mail.com",
    "price": 850,
    "rooms": 1,
    "size": 35,
    "floor": 3,
    "availability": "Available",
    "furnished": true,
    "pets_allowed": false,
    "smoking_allowed": false,
    "elevator": true,
    "balcony": false,
    "deposit": 2000
  }
```	

4. create a python environment and install the required packages for the backend.

```bash
python -m venv .venv && source .venv/bin/activate && cd app/backend && pip install -r requirements.txt
```

5. Deploy `gpt-4o-realtime-preview` in the Azure OpenAI Service.

6. Run the backend server.

```bash
cd app/backend && python app.py
```

7. Run the frontend server.

```bash
cd app/frontend && npm run dev
```

both the frontend and backend servers should be running for the app to work.

## Interactive voice commands:
- `I am looking for a flat in the city center show me some options`
- `I like this flat (say the flat's title and ask for more details)`
- `I like this flat (say the flat's title) could you add it to my favorites`
- `I like this flat (say the flat's title) could you zoom in on the map`
