# domago

An interactive way to search flats in Vienna using Microsoft AI services.

## Screenshot

![Screenshot of domago](ui/v1.png)

## Pre-requisites

Clicking on button bellow will redirect you to the Azure portal to deploy the resources necessary to conduct this demo using the ARM template provided in this repository.

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fmoalsayed95%2Fdomago%2Fms%2Finfra%2Fazuredeploy.json)

This script will create the following resources: Azure AI Search, Azure Cosmos DB, Storage Account, Azure Maps Account, Azure OpenAI Service (with the deployments of `gpt-4o-realtime-preview` and `text-embedding-3-large`)

## Development Environment
1. Clone the repository.

    ```bash	
    git clone https://github.com/moalsayed95/domago.git
    ```

2. GitHub Codespaces is a cloud-based dev environment that lets you code anywhere, with pre- 
configured setups directly from GitHub repositories. Access it via browser, VS Code, or GitHub CLI. 

    
    [![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/)

    Please select your forked repository from the dropdown and choose `default_environment (Python 3.11)` as your default codespace configuration

3. Log in into your Azure account using the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/). Use `az login` to start.

4. After deploying the resources, you will need to configure the environment variables in the .env file.  This file is automatically created running the following command within the terminal in your Codespace:

    ```bash
    ./get-keys.sh --resource-group <resource-group-name>
    ```
    If you run into into permission issues, run: 

    ```bash
    chmod u+r+x ./get-keys.sh --resource-group <resource-group-name>
    ```

4. Create the AI search Index and index the dummy data from the `data` folder. The data folder has the flats data in JSON format `data/flat_cata.json`. You can do this by running the `index_manager.py` script in the backend project.


5. Run the backend server.

    ```bash
    cd app/backend && python app.py
    ```

6. Open another terminal and run the frontend server.

    ```bash
    cd app/frontend && npm run dev
    ```

    Both the frontend and backend servers should be running for the app to work.

## Interactive voice commands:
- `I am looking for a flat in the city center show me some options`
- `I like this flat (say the flat's title and ask for more details)`
- `I like this flat (say the flat's title) could you add it to my favorites`
- `I like this flat (say the flat's title) could you zoom in on the map`
