import json
import logging
import os
import sys
import time
import uuid
from dotenv import load_dotenv

load_dotenv()

from azure.identity import DefaultAzureCredential
import requests

logging.basicConfig(stream=sys.stdout, level=logging.INFO,  # set to logging.DEBUG for verbose output
        format="[%(asctime)s] %(message)s", datefmt="%m/%d/%Y %I:%M:%S %p %Z")
logger = logging.getLogger(__name__)

# The endpoint (and key) could be gotten from the Keys and Endpoint page in the Speech service resource.
# The endpoint would be like: https://<azure_ai_resource>.cognitiveservices.azure.com
# If you want to use passwordless authentication, custom domain is required.
SPEECH_ENDPOINT = os.getenv('SPEECH_ENDPOINT')
API_VERSION = "2024-04-15-preview"

def _create_job_id():
    # the job ID must be unique in current speech resource
    # you can use a GUID or a self-increasing number
    return uuid.uuid4()

def _authenticate():
    SUBSCRIPTION_KEY = os.getenv("SUBSCRIPTION_KEY", '{YOUR_SUBCRIPTION_KEY}')
    return {'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY}

def submit_synthesis(job_id: str):
    url = f'{SPEECH_ENDPOINT}/avatar/batchsyntheses/{job_id}?api-version={API_VERSION}'
    header = {
        'Content-Type': 'application/json'
    }
    header.update(_authenticate())
    isCustomized = False

    payload = {
        'synthesisConfig': {
            # "voice": 'en-US-JennyMultilingualNeural'
            "voice": '{VOICE_NAME}', 
        },
        # Replace with your custom voice name and deployment ID if you want to use custom voice.
        # Multiple voices are supported, the mixture of custom voices and platform voices is allowed.
        # Invalid voice name or deployment ID will be rejected.
        'customVoices': {
            # "YOUR_CUSTOM_VOICE_NAME": "YOUR_CUSTOM_VOICE_ID"
        },
        "inputKind": "plainText",
        "inputs": [
            {
                "content": "Hi, I'm a virtual assistant created by Microsoft.",
            },
        ],
        "avatarConfig":
        {
            "customized": isCustomized, # set to True if you want to use customized avatar
            # "talkingAvatarCharacter": 'Lisa-casual-sitting'
            "talkingAvatarCharacter": '{TALKING_AVATAR_CHARACTER_NAME}',  # talking avatar character
            "videoFormat": "mp4",  # mp4 or webm, webm is required for transparent background
            "videoCodec": "h264",  # hevc, h264 or vp9, vp9 is required for transparent background; default is hevc
            "subtitleType": "soft_embedded",
            "backgroundColor": "#FFFFFFFF", # background color in RGBA format, default is white; can be set to 'transparent' for transparent background
            # "backgroundImage": "https://samples-files.com/samples/Images/jpg/1920-1080-sample.jpg", # background image URL, only support https, either backgroundImage or backgroundColor can be set
        }
        if isCustomized
        else
        {
            "customized": isCustomized, # set to True if you want to use customized avatar
            # "talkingAvatarCharacter": 'Lisa'
            "talkingAvatarCharacter": '{TALKING_AVATAR_CHARACTER}',  # talking avatar character
            # "talkingAvatarStyle": 'casual-sitting'
            "talkingAvatarStyle": '{TALKING_AVATAR_STYLE}',  # talking avatar style, required for prebuilt avatar, optional for custom avatar
            "videoFormat": "mp4",  # mp4 or webm, webm is required for transparent background
            "videoCodec": "h264",  # hevc, h264 or vp9, vp9 is required for transparent background; default is hevc
            "subtitleType": "soft_embedded",
            "backgroundColor": "#FFFFFFFF", # background color in RGBA format, default is white; can be set to 'transparent' for transparent background
            # "backgroundImage": "https://samples-files.com/samples/Images/jpg/1920-1080-sample.jpg", # background image URL, only support https, either backgroundImage or backgroundColor can be set
        }
    }

    response = requests.put(url, json.dumps(payload), headers=header)
    if response.status_code < 400:
        logger.info('Batch avatar synthesis job submitted successfully')
        logger.info(f'Job ID: {response.json()["id"]}')
        return True
    else:
        logger.error(f'Failed to submit batch avatar synthesis job: [{response.status_code}], {response.text}')

def get_synthesis(job_id):
    url = f'{SPEECH_ENDPOINT}/avatar/batchsyntheses/{job_id}?api-version={API_VERSION}'
    header = _authenticate()

    response = requests.get(url, headers=header)
    if response.status_code < 400:
        logger.debug('Get batch synthesis job successfully')
        logger.debug(response.json())
        if response.json()['status'] == 'Succeeded':
            logger.info(f'Batch synthesis job succeeded, download URL: {response.json()["outputs"]["result"]}')
        return response.json()['status']
    else:
        logger.error(f'Failed to get batch synthesis job: {response.text}')

def list_synthesis_jobs(skip: int = 0, max_page_size: int = 100):
    """List all batch synthesis jobs in the subscription"""
    url = f'{SPEECH_ENDPOINT}/avatar/batchsyntheses?api-version={API_VERSION}&skip={skip}&maxpagesize={max_page_size}'
    header = _authenticate()

    response = requests.get(url, headers=header)
    if response.status_code < 400:
        logger.info(f'List batch synthesis jobs successfully, got {len(response.json()["values"])} jobs')
        logger.info(response.json())
    else:
        logger.error(f'Failed to list batch synthesis jobs: {response.text}')

if __name__ == '__main__':
    job_id = _create_job_id()
    if submit_synthesis(job_id):
        while True:
            status = get_synthesis(job_id)
            if status == 'Succeeded':
                logger.info('batch avatar synthesis job succeeded')
                break
            elif status == 'Failed':
                logger.error('batch avatar synthesis job failed')
                break
            else:
                logger.info(f'batch avatar synthesis job is still running, status [{status}]')
                time.sleep(5)
            