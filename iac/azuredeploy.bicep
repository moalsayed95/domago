@allowed([
  'swedencentral'
])
@description('Azure location where resources should be deployed (e.g., swedencentral)')
param location string = 'swedencentral'

@allowed([
  'westeurope'
])
@description('Azure location where Azure Maps should be deployed (e.g., westeurope)')
param locationAzureMaps string = 'westeurope' // West Europe is the only EU region that supports Azure Maps


var prefix = 'domago'
var suffix = uniqueString(resourceGroup().id)

/*
  Create a Cosmos DB account with a database and a container
*/

var databaseAccountName = '${prefix}-cosmosdb-${suffix}'
var databaseName = 'DomagoDB'
var databaseContainerNames = ['data', 'pics']

var locations = [
  {
    locationName: location
    failoverPriority: 0
    isZoneRedundant: false
  }
]

resource databaseAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: databaseAccountName
  kind: 'GlobalDocumentDB'
  location: location
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: locations
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  name: databaseName
  parent: databaseAccount
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource databaseContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = [for containerName in databaseContainerNames: {
  name: containerName
  parent: database
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
    }
    options: {
      autoscaleSettings: {
        maxThroughput: 1000
      }
    }
  }
}]

/*
  Create Storage Account
*/

var storageAccountName = replace('${prefix}-sa-${suffix}', '-', '')

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

/* 
  Create Azure OpenAI Cognitive Services
*/

var aiCognitiveServicesName = '${prefix}-aiservices-${suffix}'

resource aiCognitiveServices 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: aiCognitiveServicesName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    apiProperties: {
      statisticsEnabled: false
    }
  }
}

resource aiCognitiveServicesDeployment1 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'gpt-4o-realtime-preview'
  parent: aiCognitiveServices
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-realtime-preview'
      version: '2024-10-01'
    }
  }
  sku: {
    name: 'GlobalStandard'
    capacity: 2
  }
}

resource aiCognitiveServicesDeployment2 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'text-embedding-3-large'
  parent: aiCognitiveServices
  dependsOn: [
    aiCognitiveServicesDeployment1
  ]
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: '1'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 5
  }
}

/*
  Create Azure Maps Account
*/

var azureMapsName = '${prefix}-maps-${suffix}'

resource azureMaps 'Microsoft.Maps/accounts@2024-01-01-preview' = {
  name: azureMapsName
  location: locationAzureMaps
  sku: {
    name: 'G2'
  }
  kind: 'Gen2'
  properties: {
    disableLocalAuth: false
    cors: {
      corsRules: [
        {
          allowedOrigins: []
        }
      ]
    }
    publicNetworkAccess: 'enabled'
    locations: []
  }
}

/*
  Create Azure AI Search
*/

var searchServiceName = '${prefix}-search-${suffix}'

resource searchService 'Microsoft.Search/searchServices@2023-11-01' = {
  name: searchServiceName
  location: location
  sku: {
    name: 'basic'
  }
  properties: {
    hostingMode: 'default'
  }
  dependsOn: [
    aiCognitiveServices
  ]
}

/*
  Return output values
*/

output storageAccountName string = storageAccountName
output cosmosdbAccountName string = databaseAccountName
output azureMapsName string = azureMapsName
output aiCognitiveServicesName string = aiCognitiveServicesName
output searchServiceName string = searchServiceName
