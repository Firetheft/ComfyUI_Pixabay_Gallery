import server
from aiohttp import web
import aiohttp
import os
import json
import torch
import numpy as np
from PIL import Image
import io
import time
import requests

NODE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(NODE_DIR, "config.json")
IMAGE_DATA_FILE = os.path.join(NODE_DIR, "selected_image.json")
VIDEO_DATA_FILE = os.path.join(NODE_DIR, "selected_video.json")
FAVORITES_FILE = os.path.join(NODE_DIR, "pixabay_favorites.json")

def get_api_key():
    if not os.path.exists(CONFIG_FILE):
        return None
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get("pixabay_api_key")
    except Exception:
        return None

def load_favorites():
    if not os.path.exists(FAVORITES_FILE):
        return {}
    try:
        with open(FAVORITES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (IOError, json.JSONDecodeError):
        return {}

def save_favorites(data):
    try:
        with open(FAVORITES_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except IOError as e:
        print(f"Error saving favorites: {e}")

class PixabayImageNode:
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        if os.path.exists(IMAGE_DATA_FILE):
            return os.path.getmtime(IMAGE_DATA_FILE)
        return float("NaN")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    RETURN_TYPES = ("IMAGE", "STRING",)
    RETURN_NAMES = ("image", "info",)
    FUNCTION = "get_selected_image"
    CATEGORY = "📜Asset Gallery/Pixabay"

    def get_selected_image(self):
        try:
            with open(IMAGE_DATA_FILE, 'r', encoding='utf-8') as f:
                item_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return (torch.zeros(1, 1, 1, 3), "No image selected.")

        info_string = json.dumps(item_data, indent=4, ensure_ascii=False)
        image_url = item_data.get("largeImageURL")
        
        if not image_url:
            return (torch.zeros(1, 1, 1, 3), info_string)
        
        img_data = None
        headers = {'User-Agent': 'Mozilla/5.0'}
        proxies = { "http": None, "https": None }

        try:
            response = requests.get(image_url, headers=headers, timeout=30, proxies=proxies)
            response.raise_for_status() 
            img_data = response.content
        except Exception as e:
            raise RuntimeError(f"Failed to download image from URL: {image_url} - {e}")

        img = Image.open(io.BytesIO(img_data))
        
        if img.mode == 'RGBA' or (img.mode == 'P' and 'transparency' in img.info):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        
        img_array = np.array(img).astype(np.float32) / 255.0
        tensor = torch.from_numpy(img_array)[None,]

        return (tensor, info_string,)

class PixabayVideoNode:
    @classmethod
    def IS_CHANGED(cls, **kwargs):
        if os.path.exists(VIDEO_DATA_FILE):
            return os.path.getmtime(VIDEO_DATA_FILE)
        return float("NaN")

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {}}

    RETURN_TYPES = ("STRING", "STRING",)
    RETURN_NAMES = ("video_url", "info",)
    FUNCTION = "get_selected_video"
    CATEGORY = "📜Asset Gallery/Pixabay"

    def get_selected_video(self):
        try:
            with open(VIDEO_DATA_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                item_data = data.get("item", {})
                resolution = data.get("resolution", "tiny") 
        except (FileNotFoundError, json.JSONDecodeError):
            return ("", "No video selected.")

        info_string = json.dumps(item_data, indent=4, ensure_ascii=False)
        videos = item_data.get("videos", {})
        
        resolution_order = ["tiny", "small", "medium", "large"]
        if resolution not in resolution_order:
            resolution = "tiny"
        
        start_index = resolution_order.index(resolution)
        
        video_url = ""
        for i in range(start_index, len(resolution_order)):
            res_key = resolution_order[i]
            if res_key in videos and videos[res_key].get("url"):
                video_url = videos[res_key]["url"]
                break
        
        return (video_url, info_string,)


@server.PromptServer.instance.routes.post("/pixabay_gallery/set_image")
async def set_pixabay_image(request):
    data = await request.json()
    with open(IMAGE_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return web.json_response({"status": "ok"})

@server.PromptServer.instance.routes.post("/pixabay_gallery/set_video")
async def set_pixabay_video(request):
    data = await request.json()
    with open(VIDEO_DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    return web.json_response({"status": "ok"})

@server.PromptServer.instance.routes.get("/pixabay_gallery/media")
async def get_pixabay_media(request):
    api_key = get_api_key()
    if not api_key or "YOUR_PIXABAY_API_KEY" in api_key:
        return web.json_response({"error": "API key not found or is invalid in config.json"}, status=400)

    params = dict(request.query)
    params['key'] = api_key
    media_type = params.pop('media_type', 'images')
    base_url = f"https://pixabay.com/api/{'videos/' if media_type == 'videos' else ''}"
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(base_url, params=params) as response:
                response.raise_for_status()
                data = await response.json()
                return web.json_response(data)
        except aiohttp.ClientError as e:
            return web.json_response({"error": f"Failed to connect to Pixabay API: {e}"}, status=500)

@server.PromptServer.instance.routes.post("/pixabay_gallery/toggle_favorite")
async def toggle_favorite(request):
    try:
        data = await request.json()
        item = data.get("item")
        if not item or 'id' not in item:
            return web.json_response({"status": "error", "message": "Invalid item data"}, status=400)
        
        item_id = str(item['id'])
        favorites = load_favorites()
        
        if item_id in favorites:
            del favorites[item_id]
            status = "removed"
        else:
            favorites[item_id] = item
            status = "added"
            
        save_favorites(favorites)
        return web.json_response({"status": status})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=500)

@server.PromptServer.instance.routes.get("/pixabay_gallery/get_favorites_list")
async def get_favorites_list(request):
    favorites = load_favorites()
    return web.json_response(list(favorites.keys()))

@server.PromptServer.instance.routes.get("/pixabay_gallery/get_favorites_media")
async def get_favorites_media(request):
    try:
        page = int(request.query.get('page', '1'))
        per_page = int(request.query.get('per_page', '30'))
        
        favorites = load_favorites()
        items = list(favorites.values())[::-1]
        
        total_hits = len(items)
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        
        paginated_items = items[start_index:end_index]
        
        response_data = {
            "totalHits": total_hits,
            "hits": paginated_items
        }
        
        return web.json_response(response_data)
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)

NODE_CLASS_MAPPINGS = {
    "PixabayImageNode": PixabayImageNode,
    "PixabayVideoNode": PixabayVideoNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "PixabayImageNode": "Pixabay Image Gallery",
    "PixabayVideoNode": "Pixabay Video Gallery"
}