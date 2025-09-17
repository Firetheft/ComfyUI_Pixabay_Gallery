import { api } from "/scripts/api.js";

function setupGlobalLightbox() {
    if (document.getElementById('global-pixabay-lightbox')) return;

    const lightboxId = 'global-pixabay-lightbox';
    const lightboxHTML = `
        <div id="${lightboxId}" class="lightbox-overlay">
            <button class="lightbox-close">&times;</button>
            <button class="lightbox-prev">&lt;</button>
            <button class="lightbox-next">&gt;</button>
            <div class="lightbox-content">
                <img src="" alt="Preview" style="display: none;">
                <video src="" controls autoplay loop style="max-width: 95%; max-height: 95%; display: none;"></video>
            </div>
            <div class="lightbox-dimensions"></div>
        </div>`;
    
    const lightboxCSS = `
        #${lightboxId} { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.85); display: none; align-items: center; justify-content: center; z-index: 10000; box-sizing: border-box; -webkit-user-select: none; user-select: none; }
        #${lightboxId} .lightbox-content { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        #${lightboxId} img, #${lightboxId} video { max-width: 95%; max-height: 95%; object-fit: contain; }
        #${lightboxId} .lightbox-close { position: absolute; top: 15px; right: 20px; width: 35px; height: 35px; background-color: rgba(0,0,0,0.5); color: #fff; border-radius: 50%; border: 2px solid #fff; font-size: 24px; line-height: 30px; text-align: center; cursor: pointer; z-index: 10002; }
        #${lightboxId} .lightbox-prev, #${lightboxId} .lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); width: 45px; height: 60px; background-color: rgba(0,0,0,0.4); color: #fff; border: none; font-size: 30px; cursor: pointer; z-index: 10001; transition: background-color 0.2s; }
        #${lightboxId} .lightbox-prev:hover, #${lightboxId} .lightbox-next:hover { background-color: rgba(0,0,0,0.7); }
        #${lightboxId} .lightbox-prev { left: 15px; }
        #${lightboxId} .lightbox-next { right: 15px; }
        #${lightboxId} [disabled] { display: none; }
        #${lightboxId} .lightbox-dimensions { position: absolute; bottom: 0px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.6); color: #fff; padding: 4px 8px; border-radius: 5px; font-size: 14px; z-index: 10001; }
    `;
    document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    const styleEl = document.createElement('style');
    styleEl.textContent = lightboxCSS;
    document.head.appendChild(styleEl);

    const lightbox = document.getElementById(lightboxId);
    const lightboxImg = lightbox.querySelector("img");
    const lightboxVideo = lightbox.querySelector("video");
    const prevButton = lightbox.querySelector(".lightbox-prev");
    const nextButton = lightbox.querySelector(".lightbox-next");
    const dimensionsEl = lightbox.querySelector(".lightbox-dimensions");
    
    let currentMediaList = [];
    let currentIndex = -1;
    let currentResolution = 'tiny';

    function showMediaAtIndex(index) {
        if (index < 0 || index >= currentMediaList.length) return;
        
        currentIndex = index;
        const media = currentMediaList[index];
        
        lightbox.style.display = 'flex';
        dimensionsEl.textContent = 'Loading...';

        if (media.videos) {
            lightboxImg.style.display = 'none';
            lightboxVideo.style.display = 'block';
            const videoInfo = media.videos[currentResolution] || media.videos.large || media.videos.medium || media.videos.small || media.videos.tiny;
            lightboxVideo.src = videoInfo.url;
            dimensionsEl.textContent = `${videoInfo.width} x ${videoInfo.height}`;
        } else {
            lightboxVideo.style.display = 'none';
            lightboxVideo.pause();
            lightboxVideo.src = "";
            lightboxImg.style.display = 'block';
            lightboxImg.src = media.largeImageURL;
            
            const tempImg = new Image();
            tempImg.onload = () => {
                dimensionsEl.textContent = `${tempImg.naturalWidth} x ${tempImg.naturalHeight}`;
            };
            tempImg.onerror = () => {
                dimensionsEl.textContent = 'Dimension Error';
            };
            tempImg.src = media.largeImageURL;
            if (tempImg.complete) {
                dimensionsEl.textContent = `${tempImg.naturalWidth} x ${tempImg.naturalHeight}`;
            }
        }

        prevButton.disabled = currentIndex === 0;
        nextButton.disabled = currentIndex === currentMediaList.length - 1;
    }

    const closeLightbox = () => {
        lightbox.style.display = 'none';
        lightboxImg.src = "";
        lightboxVideo.pause();
        lightboxVideo.src = "";
    };
    
    prevButton.addEventListener('click', () => showMediaAtIndex(currentIndex - 1));
    nextButton.addEventListener('click', () => showMediaAtIndex(currentIndex + 1));
    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    window.addEventListener('keydown', (e) => {
        if (lightbox.style.display !== 'flex') return;
        if (e.key === 'ArrowLeft') { e.preventDefault(); prevButton.click(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); nextButton.click(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    });

    window.showPixabayMediaInLightbox = (index, mediaList, resolution) => {
        currentMediaList = mediaList;
        currentIndex = index;
        currentResolution = resolution;
        showMediaAtIndex(index);
    };
}

const langMapping = {
    "英语-English": "en", "中文-Chinese": "zh", "日语-Japanese": "ja", "韩语-Korean": "ko",
    "捷克语-Czech": "cs", "丹麦语-Danish": "da", "德语-German": "de", "西班牙语-Spanish": "es",
    "法语-French": "fr", "印尼语-Indonesian": "id", "意大利语-Italian": "it", "匈牙利语-Hungarian": "hu",
    "荷兰语-Dutch": "nl", "挪威语-Norwegian": "no", "波兰语-Polish": "pl", "葡萄牙语-Portuguese": "pt",
    "罗马尼亚语-Romanian": "ro", "斯洛伐克语-Slovak": "sk", "芬兰语-Finnish": "fi", "瑞典语-Swedish": "sv",
    "土耳其语-Turkish": "tr", "越南语-Vietnamese": "vi", "泰语-Thai": "th", "保加利亚语-Bulgarian": "bg",
    "俄语-Russian": "ru", "希腊语-Greek": "el"
};

const categoryMapping = {
    "所有-All": "", "背景-Backgrounds": "backgrounds", "时尚-Fashion": "fashion", "自然-Nature": "nature",
    "科学-Science": "science", "教育-Education": "education", "情感-Feelings": "feelings", "健康-Health": "health",
    "人物-People": "people", "宗教-Religion": "religion", "地点-Places": "places", "动物-Animals": "animals",
    "工业-Industry": "industry", "电脑-Computer": "computer", "食物-Food": "food", "运动-Sports": "sports",
    "交通-Transportation": "transportation", "旅行-Travel": "travel", "建筑-Buildings": "buildings",
    "商业-Business": "business", "音乐-Music": "music"
};

const colorMapping = {
    "所有颜色-All Colors": "", "灰度-Grayscale": "grayscale", "透明-Transparent": "transparent",
    "红色-Red": "red", "橙色-Orange": "orange", "黄色-Yellow": "yellow", "绿色-Green": "green",
    "青色-Turquoise": "turquoise", "蓝色-Blue": "blue", "紫丁香-Lilac": "lilac",
    "粉色-Pink": "pink", "白色-White": "white", "灰色-Gray": "gray", "黑色-Black": "black", "棕色-Brown": "brown"
};

const imageTypeMapping = { "所有-All": "all", "照片-Photo": "photo", "插图-Illustration": "illustration", "矢量图-Vector": "vector" };
const videoTypeMapping = { "所有-All": "all", "影片-Film": "film", "动画-Animation": "animation" };
const orientationMapping = { "所有-All": "all", "横向-Horizontal": "horizontal", "纵向-Vertical": "vertical" };
const orderMapping = { "热门-Popular": "popular", "最新-Latest": "latest" };

const videoResolutionMapping = {
    "微-Tiny": "tiny",
    "小-Small": "small",
    "中-Medium": "medium",
    "大-Large": "large"
};

const createOptions = (mapping) => Object.keys(mapping).map(k => `<option value="${mapping[k]}">${k}</option>`).join('');

const imageControlsHTML = `
    <label>Language:</label><select data-param="lang">${createOptions(langMapping)}</select>
    <label>Type:</label><select data-param="image_type">${createOptions(imageTypeMapping)}</select>
    <label>Orientation:</label><select data-param="orientation">${createOptions(orientationMapping)}</select>
    <label>Category:</label><select data-param="category">${createOptions(categoryMapping)}</select>
    <label>Order:</label><select data-param="order">${createOptions(orderMapping)}</select>
    <label>Colors:</label><select data-param="colors">${createOptions(colorMapping)}</select>
    <input type="text" data-param="q" value="Girl" placeholder="Search...">
    <label>Favorites ★:</label><input type="checkbox" data-setting="showFavorites">
`;

const videoControlsHTML = `
    <label>Language:</label><select data-param="lang">${createOptions(langMapping)}</select>
    <label>Type:</label><select data-param="video_type">${createOptions(videoTypeMapping)}</select>
    <label>Category:</label><select data-param="category">${createOptions(categoryMapping)}</select>
    <label>Order:</label><select data-param="order">${createOptions(orderMapping)}</select>
    <label>Resolution:</label><select data-setting="resolution">${createOptions(videoResolutionMapping)}</select>
    <input type="text" data-param="q" value="Girl" placeholder="Search...">
    <label>Favorites ★:</label><input type="checkbox" data-setting="showFavorites">
`;

export function setupGallery(node, mediaType) {
    setupGlobalLightbox();

    const galleryContainer = document.createElement("div");
    const uniqueId = `pixabay-gallery-${Math.random().toString(36).substring(2, 9)}`;
    galleryContainer.id = uniqueId;

    galleryContainer.innerHTML = `
        <style>
            #${uniqueId} .pixabay-gallery-wrapper { width: 100%; font-family: sans-serif; color: #ccc; box-sizing: border-box; display: flex; flex-direction: column; height: 100%; }
            #${uniqueId} .pixabay-controls { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; align-items: center; flex-shrink: 0; }
            #${uniqueId} .pixabay-controls label { margin-left: 5px; font-size: 12px; }
            #${uniqueId} .pixabay-controls select, #${uniqueId} .pixabay-controls input { background-color: #333; color: #ccc; border: 1px solid #555; border-radius: 4px; padding: 4px; font-size: 12px; }
            #${uniqueId} .pixabay-cardholder { position: relative; overflow-y: auto; background: #222; padding: 0 5px; border-radius: 5px; flex-grow: 1; min-height: 100px; width: 100%; }
            #${uniqueId} .pixabay-card { position: absolute; border: 3px solid transparent; border-radius: 8px; box-sizing: border-box; transition: all 0.2s ease-in-out; overflow: hidden;}
            #${uniqueId} .pixabay-card.selected { border-color: #00FFC9; }
            #${uniqueId} .pixabay-card img, #${uniqueId} .pixabay-card video { width: 100%; height: auto; cursor: pointer; border-radius: 5px; display: block; }
            #${uniqueId} .pixabay-card:hover { transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,255,201,0.2); }
            #${uniqueId} .pixabay-card-fav-btn { position: absolute; top: 5px; left: 8px; z-index: 10; width: 24px; height: 24px; background-color: rgba(0,0,0,0.5); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; cursor: pointer; transition: all 0.2s; border: none; padding: 0; opacity: 0; }
            #${uniqueId} .pixabay-card:hover .pixabay-card-fav-btn { opacity: 1; }
            #${uniqueId} .pixabay-card-fav-btn.favorited { color: #FFD700; opacity: 1; }
            #${uniqueId} .pixabay-cardholder::-webkit-scrollbar { width: 8px; }
            #${uniqueId} .pixabay-cardholder::-webkit-scrollbar-track { background: #2a2a2a; border-radius: 4px; }
            #${uniqueId} .pixabay-cardholder::-webkit-scrollbar-thumb { background-color: #555; border-radius: 4px; }
        </style>
        <div class="pixabay-gallery-wrapper">
            <div class="pixabay-controls">
                ${mediaType === 'images' ? imageControlsHTML : videoControlsHTML}
            </div>
            <div class="pixabay-cardholder">
                <p class="loading-message">Change filters to load media.</p>
            </div>
        </div>
    `;

    node.addDOMWidget("gallery", "div", galleryContainer, {});

    const cardholder = galleryContainer.querySelector(".pixabay-cardholder");
    const controls = galleryContainer.querySelector(".pixabay-controls");
    const showFavoritesCheckbox = controls.querySelector("[data-setting='showFavorites']");

    let isLoading = false; let page = 1; let hasMore = true;
    let favorites = new Set();

    const debounce = (func, delay) => { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; };

    const applyMasonryLayout = () => {
        const minCardWidth = 150; const gap = 5;
        const containerWidth = cardholder.clientWidth;
        if (containerWidth === 0) return;
        
        const columnCount = Math.max(1, Math.floor(containerWidth / (minCardWidth + gap)));
        const totalGapSpace = (columnCount - 1) * gap;
        const actualCardWidth = (containerWidth - totalGapSpace) / columnCount;
        const columnHeights = new Array(columnCount).fill(0);
        const cards = cardholder.querySelectorAll(".pixabay-card");
        
        cards.forEach(card => {
            card.style.width = `${actualCardWidth}px`;
            const minHeight = Math.min(...columnHeights);
            const columnIndex = columnHeights.indexOf(minHeight);
            card.style.left = `${columnIndex * (actualCardWidth + gap)}px`;
            card.style.top = `${minHeight}px`;
            columnHeights[columnIndex] += card.offsetHeight + gap;
        });

        cardholder.style.height = `${Math.max(...columnHeights)}px`;
    };

    const debouncedLayout = debounce(applyMasonryLayout, 50);
    new ResizeObserver(debouncedLayout).observe(cardholder);

    const fetchMedia = async (newPage = false) => {
        if (isLoading) return; isLoading = true;
        if (newPage) { page = 1; hasMore = true; cardholder.innerHTML = '<p class="loading-message">Loading...</p>'; }

        const params = new URLSearchParams();
        let url;

        if (showFavoritesCheckbox.checked) {
            params.append("page", page.toString());
            params.append("per_page", 30);
            url = `/pixabay_gallery/get_favorites_media?${params.toString()}`;
        } else {
            controls.querySelectorAll("[data-param]").forEach(el => {
                const key = el.dataset.param;
                const value = el.type === 'checkbox' ? el.checked : el.value;
                if (value) { params.append(key, value); }
            });
            params.append("page", page.toString());
            params.append("per_page", 30);
            url = `/pixabay_gallery/media?media_type=${mediaType}&${params.toString()}`;
        }

        try {
            const response = await api.fetchApi(url);
            if (!response.ok) throw new Error((await response.json()).error);
            const data = await response.json();
            if (newPage) cardholder.innerHTML = "";
            if (data.hits.length === 0) {
                 hasMore = false;
                 if (newPage) cardholder.innerHTML = '<p class="loading-message">No results found.</p>';
                 return;
            }
            data.hits.forEach(item => {
                const isItemVideo = !!item.videos;

                if (showFavoritesCheckbox.checked) {
                    if (mediaType === 'images' && isItemVideo) return;
                    if (mediaType === 'videos' && !isItemVideo) return;
                }

                const card = document.createElement('div');
                card.className = 'pixabay-card';
                card.pixabayItem = item;

                const favBtn = document.createElement("button");
                favBtn.className = "pixabay-card-fav-btn";
                favBtn.innerHTML = "★";
                if (favorites.has(String(item.id))) {
                    favBtn.classList.add("favorited");
                }
                favBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const itemIdStr = String(item.id);
                    const isFavorited = favBtn.classList.toggle("favorited");

                    if (isFavorited) {
                        favorites.add(itemIdStr);
                    } else {
                        favorites.delete(itemIdStr);
                        if (showFavoritesCheckbox.checked) {
                            card.remove();
                            setTimeout(applyMasonryLayout, 50);
                        }
                    }

                    await api.fetchApi("/pixabay_gallery/toggle_favorite", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ item: item })
                    });
                });
                card.appendChild(favBtn);

                let mediaEl;
                if (isItemVideo) {
                    const thumbnailEl = document.createElement('img');
                    thumbnailEl.src = item.videos.tiny.thumbnail;
                    card.appendChild(thumbnailEl);

                    const videoEl = document.createElement('video');
                    videoEl.style.display = 'none';
                    videoEl.dataset.src = item.videos.tiny.url;
                    Object.assign(videoEl, { loop: true, muted: true, playsinline: true, preload: "none" });
                    card.appendChild(videoEl);

                    card.addEventListener('mouseenter', () => {
                        thumbnailEl.style.display = 'none';
                        videoEl.style.display = 'block';
                        if (!videoEl.src) {
                            videoEl.src = videoEl.dataset.src;
                        }
                        videoEl.play();
                    });

                    card.addEventListener('mouseleave', () => {
                        videoEl.pause();
                        videoEl.style.display = 'none';
                        thumbnailEl.style.display = 'block';
                    });

                    mediaEl = thumbnailEl;
                } else {
                    mediaEl = document.createElement('img');
                    mediaEl.src = item.webformatURL.replace('_640.jpg', '_340.jpg');
                    card.appendChild(mediaEl);
                }

                const onMediaLoad = () => { if (card.isConnected) debouncedLayout(); };
                mediaEl.onload = onMediaLoad;
                mediaEl.onloadeddata = onMediaLoad;
                cardholder.appendChild(card);
            });
            page++; 
            if (data.totalHits) hasMore = (page - 1) * 30 < data.totalHits;
            requestAnimationFrame(applyMasonryLayout);
        } catch (error) {
            console.error("Error fetching Pixabay media:", error);
            cardholder.innerHTML = `<p class="loading-message error">${error.message}</p>`;
        } finally { isLoading = false; }
    };

    const debouncedFetch = debounce(() => fetchMedia(true), 300);

    const refreshAndFetch = () => {
        const isFav = showFavoritesCheckbox.checked;
        controls.querySelectorAll("[data-param]").forEach(el => el.disabled = isFav);
        fetchMedia(true);
    };

    controls.querySelectorAll('select[data-param], input[type=text][data-param]').forEach(el => {
        el.addEventListener('change', refreshAndFetch);
        if (el.tagName === 'INPUT') {
            el.addEventListener('keyup', debouncedFetch);
        }
    });
    showFavoritesCheckbox.addEventListener('change', refreshAndFetch);

    cardholder.addEventListener("scroll", () => { if (hasMore && !isLoading && cardholder.scrollTop + cardholder.clientHeight >= cardholder.scrollHeight - 300) { fetchMedia(); } });
    
    const sendSelectionToServer = async () => {
        const selectedCard = galleryContainer.querySelector('.pixabay-card.selected');
        if (!selectedCard) return;

        let endpoint = '';
        let payload = {};

        if (mediaType === 'images') {
            endpoint = '/pixabay_gallery/set_image';
            payload = selectedCard.pixabayItem;
        } else {
            endpoint = '/pixabay_gallery/set_video';
            const resolution = controls.querySelector("[data-setting='resolution']").value;
            payload = {
                item: selectedCard.pixabayItem,
                resolution: resolution
            };
        }
        
        try {
            await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), });
            node.setDirtyCanvas(true, true);
        } catch (e) { console.error("Error sending data to backend:", e); }
    };
    
    galleryContainer.addEventListener('click', async (event) => {
        const card = event.target.closest('.pixabay-card');
        if (!card || event.target.classList.contains('pixabay-card-fav-btn')) return;
        if (card.classList.contains('selected')) return;
        galleryContainer.querySelector('.selected')?.classList.remove('selected');
        card.classList.add('selected');
        sendSelectionToServer();
    });

    galleryContainer.addEventListener('dblclick', (event) => {
        const card = event.target.closest('.pixabay-card');
        if (!card) return;
        
        const allCards = Array.from(cardholder.querySelectorAll(".pixabay-card"));
        const currentMediaList = allCards.map(c => c.pixabayItem);
        const startIndex = allCards.indexOf(card);
        
        let resolution = 'tiny';
        if (mediaType === 'videos') {
            resolution = controls.querySelector("[data-setting='resolution']").value;
        }
        
        if (startIndex !== -1) {
            window.showPixabayMediaInLightbox(startIndex, currentMediaList, resolution);
        }
    });

    if (mediaType === 'videos') {
        const resolutionDropdown = controls.querySelector("[data-setting='resolution']");
        if (resolutionDropdown) {
            resolutionDropdown.addEventListener("change", () => {
                sendSelectionToServer();
            });
        }
    }

    const initialize = async () => {
        try {
            const res = await api.fetchApi('/pixabay_gallery/get_favorites_list');
            const favIds = await res.json();
            favorites = new Set(favIds.map(String));
        } catch(e) { console.error("Error fetching favorites list", e); }
        refreshAndFetch();
    };

    initialize();
}