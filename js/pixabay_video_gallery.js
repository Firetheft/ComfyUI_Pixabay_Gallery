import { app } from "/scripts/app.js";
import { setupGallery } from "./pixabay_gallery_utils.js";

app.registerExtension({
    name: "Comfy.PixabayVideoGallery",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PixabayVideoNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                setupGallery(this, "videos");
                this.size = [800, 670];
                return r;
            };
        }
    },
});