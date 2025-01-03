@allowed([
  'francecentral', 'westus', 'eastus'
])
@description('Azure location where resources should be deployed (e.g., swedencentral)')
param location string = 'francecentral'

var prefix = 'agent'
var suffix = uniqueString(resourceGroup().id)


/*
  Create App Service
*/

var appHostingPlanName = '${prefix}-appservice-asp-${suffix}'
var appName = '${prefix}-appservice-${suffix}'
var appLogAnalyticsWorkspaceName = '${prefix}-loganalytics-${suffix}'
var appApplicationInsightsName = '${prefix}-appinsights-${suffix}'

resource appLogAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2021-06-01' = {
  name: appLogAnalyticsWorkspaceName
  location: location
  properties: any({
    retentionInDays: 30
    features: {
      searchVersion: 1
    }
    sku: {
      name: 'PerGB2018'
    }
  })
}

resource appApplicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appApplicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: appLogAnalyticsWorkspace.id
  }
}

resource appHostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appHostingPlanName
  location: location
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  properties: {
    serverFarmId: appHostingPlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'APPINSIGHTS_CONNECTION_STRING'
          value: appApplicationInsights.properties.ConnectionString
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
      ]
      cors: {
        allowedOrigins: [
          '*'
        ]
      }
      use32BitWorkerProcess: false
      linuxFxVersion: 'PYTHON|3.12'
      appCommandLine: 'python -m pip install -r requirements.txt && python -m streamlit run app.py --server.port 8000 --server.address 0.0.0.0'
    }
    httpsOnly: true
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
}

/* 
  Create Azure AI Studio
*/

var aiCognitiveServicesName = '${prefix}-aiservices-${suffix}'
var aiKeyvaultName = replace('${prefix}-kv-${suffix}', '-', '')
var aiStorageAccountName = replace('${prefix}-strg-${suffix}', '-', '')
var aiHubName = '${prefix}-aistudio-${suffix}'
var aiHubFriendlyName = 'Agents basic hub resource'
var aiHubDescription = 'A basic hub resource required for the agent setup.'
var aiHubProjectName = 'basic-project'

resource aiKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: aiKeyvaultName
  location: location
  properties: {
    createMode: 'default'
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    enableSoftDelete: true
    enableRbacAuthorization: true
    enablePurgeProtection: true
    sku: {
      family: 'A'
      name: 'standard'
    }
    softDeleteRetentionInDays: 7
    tenantId: subscription().tenantId
  }
}

resource aiStorageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: aiStorageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

resource aiCognitiveServices 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: aiCognitiveServicesName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'AIServices' 
  properties: {
    apiProperties: {
      statisticsEnabled: false
    }
  }
}

resource aiCognitiveServicesDeployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'gpt-4o-mini'
  parent: aiCognitiveServices
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
  }
  sku: {
    name: 'GlobalStandard'
    capacity: 120
  }
}

resource aiCognitiveServicesDeployment2 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  name: 'text-embedding-ada-002'
  parent: aiCognitiveServices
  dependsOn: [
    aiCognitiveServicesDeployment
  ]
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-ada-002'
      version: '2'
    }
  }
  sku: {
    name: 'Standard'
    capacity: 20
  }
}

resource aiHub 'Microsoft.MachineLearningServices/workspaces@2024-07-01-preview' = {
  name: aiHubName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
  kind: 'hub'
  properties: {
    // organization
    friendlyName: aiHubFriendlyName
    description: aiHubDescription

    // dependent resources
    keyVault: aiKeyVault.id
    storageAccount: aiStorageAccount.id
    applicationInsights: appApplicationInsights.id
    
    publicNetworkAccess: 'Enabled'
  }

  resource aiServicesConnection 'connections@2024-07-01-preview' = {
    name: '${aiHubName}-aiservices'
    properties: {
      category: 'AIServices'
      target: aiCognitiveServices.properties.endpoint
      authType: 'ApiKey'
      isSharedToAll: true
      useWorkspaceManagedIdentity: true
      credentials: {
        key: aiCognitiveServices.listKeys().key1
      }
      metadata: {
        ApiType: 'Azure'
        ResourceId: aiCognitiveServices.id
      }
    }
  }

  resource aiSearchConnection 'connections@2024-07-01-preview' = {
    name: '${aiHubName}-search'
    properties: {
      category: 'CognitiveSearch'
      target: 'https://${searchServiceName}.search.windows.net'
      authType: 'ApiKey'
      isSharedToAll: true
      useWorkspaceManagedIdentity: true
      credentials: {
        key: searchService.listAdminKeys().primaryKey
      }
      metadata: {
        ApiType: 'Azure'
        ResourceId: aiCognitiveServices.id
      }
    }
  }
}

resource aiHubProject 'Microsoft.MachineLearningServices/workspaces@2024-07-01-preview' = {
  name: aiHubProjectName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
  kind: 'project'
  properties: {
    description: 'Call Center AI Studio Project'
    friendlyName: 'Call Center'
    hubResourceId: aiHub.id
    hbiWorkspace: false
    v1LegacyMode: false
    publicNetworkAccess: 'Enabled'
  }
}

/*
  Return output values
*/

output aiCognitiveServicesName string = aiCognitiveServicesName
output aiHubName string = aiHubName
output aiHubProjectName string = aiHubProjectName
