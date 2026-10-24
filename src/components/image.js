// Shrinks a picked photo to a small JPEG data URL so it stays light in storage.
export function shrinkImage(file, max = 640, square = false) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      if (square) {
        const side = Math.min(img.width, img.height);
        c.width = c.height = Math.min(max, side);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, c.width, c.height);
      } else {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        ctx.drawImage(img, 0, 0, c.width, c.height);
      }
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
    img.src = url;
  });
}
