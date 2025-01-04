#!/bin/bash
#
# This script will retrieve necessary keys and properties from Azure Resources
# deployed using "Deploy to Azure" button and will store them in a file named
# "config.env" in the current directory.

# Login to Azure
if [ -z "$(az account show)" ]; then
  echo "User not signed in Azure. Sign in to Azure using 'az login' command."
  az login --use-device-code
fi

# Get the resource group name from the script parameter named resource-group
resourceGroupName="domago"

# Parse named parameters
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --resource-group) resourceGroupName="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

# Check if resourceGroupName is provided
if [ -z "$resourceGroupName" ]; then
    echo "Enter the resource group name where the resources are deployed:"
    read resourceGroupName
fi

# Get resource group deployments, find deployments starting with 'Microsoft.Template' and sort them by timestamp
echo "Getting the deployments in '$resourceGroupName'..."
deploymentName=$(az deployment group list --resource-group $resourceGroupName --query "[?contains(name, 'Microsoft.Template') || contains(name, 'azuredeploy')].{name:name}[0].name" --output tsv)
if [ $? -ne 0 ]; then
	echo "Error occurred while fetching deployments. Exiting..."
	exit 1
fi

# Get output parameters from last deployment to the resource group and store them as variables
echo "Getting the output parameters from the last deployment '$deploymentName' in '$resourceGroupName'..."
az deployment group show --resource-group $resourceGroupName --name $deploymentName --query properties.outputs > tmp_outputs.json
if [ $? -ne 0 ]; then
	echo "Error occurred while fetching the output parameters. Exiting..."
	exit 1
fi

# Extract the resource names from the output parameters
echo "Extracting the resource names from the output parameters..."
aiCognitiveServicesName=$(jq -r '.aiCognitiveServicesName.value' tmp_outputs.json)
searchServiceName=$(jq -r '.searchServiceName.value' tmp_outputs.json)
azureMapsName=$(jq -r '.azureMapsName.value' tmp_outputs.json)  # Assuming azureMapsName is part of the outputs

# Delete the temporary file
rm tmp_outputs.json

# Get the keys and endpoints from the resources
echo "Getting the keys and endpoints from the resources..."
aiCognitiveServicesEndpoint=$(az cognitiveservices account show --name $aiCognitiveServicesName --resource-group $resourceGroupName --query properties.endpoint -o tsv)
aiCognitiveServicesKey=$(az cognitiveservices account keys list --name $aiCognitiveServicesName --resource-group $resourceGroupName --query key1 -o tsv)
searchServiceEndpoint=$(az search service show --resource-group $resourceGroupName --name $searchServiceName --query endpoint -o tsv)
searchServiceKey=$(az search admin-key show --resource-group $resourceGroupName --service-name $searchServiceName --query primaryKey -o tsv)
azureMapsKey=$(az cognitiveservices account keys list --name $azureMapsName --resource-group $resourceGroupName --query key1 -o tsv)  # Retrieving Azure Maps key

# Overwrite the existing config.env file
if [ -f ../.env ]; then
	rm ../.env
fi

# Store the keys and properties in a file
echo "Storing the keys and properties in '.env' file..."
echo "AZURE_OPENAI_ENDPOINT=\"$aiCognitiveServicesEndpoint\"" >> ../.env
echo "AZURE_OPENAI_REALTIME_DEPLOYMENT=\"gpt-4o-realtime-preview\"" >> ../.env
echo "AZURE_OPENAI_REALTIME_VOICE_CHOICE=\"alloy\"" >> ../.env
echo "AZURE_OPENAI_API_VERSION=\"2024-05-01-preview\"" >> ../.env
echo "AZURE_OPENAI_API_KEY=\"$aiCognitiveServicesKey\"" >> ../.env
echo "AZURE_SEARCH_INDEX=\"flat-index\"" >> ../.env
echo "AZURE_TENANT_ID=\"<your-tenant-id-here>\"" >> ../.env
echo "AZURE_SEARCH_ENDPOINT=\"$searchServiceEndpoint\"" >> ../.env
echo "AZURE_SEARCH_SERVICE_NAME=\"$searchServiceName\"" >> ../.env
echo "AZURE_SEARCH_API_KEY=\"$searchServiceKey\"" >> ../.env
echo "VITE_AZURE_MAPS_SUBSCRIPTION_KEY=\"$azureMapsKey\"" >> ../.env  # Added Azure Maps key

echo "Keys and properties are stored in '.env' file successfully."
