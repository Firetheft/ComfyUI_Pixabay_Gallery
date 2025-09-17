import { app } from "/scripts/app.js";
import { setupGallery } from "./pixabay_gallery_utils.js";

app.registerExtension({
    name: "Comfy.PixabayImageGallery",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "PixabayImageNode") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                const r = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;
                setupGallery(this, "images");
                this.size = [1000, 670];
                return r;
            };
        }
    },
});