import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [maskPreview, setMaskPreview] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [boundingBox, setBoundingBox] = useState(null); // { x0, y0, x1, y1 }
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const imageRef = useRef(null);

  // 🟢 WebSocket for progress
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8087/progress/");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8087/user-history/");
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history", error);
    }
  };

  // 🟢 Handle image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setMaskPreview(null);
    setBoundingBox(null);
    setStartPoint(null);
  };

  // 🟢 Mouse event handlers for drawing a square bounding box
  const handleMouseDown = (event) => {
    event.preventDefault();
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);
    // Use the first coordinate as the top-left
    setStartPoint({ x, y });
    setBoundingBox(null);
    setIsDrawing(true);
  };

  const handleMouseMove = (event) => {
    if (!isDrawing || !startPoint || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = Math.round(event.clientX - rect.left);
    const currentY = Math.round(event.clientY - rect.top);

    // Calculate differences assuming user drags down and right.
    const dx = currentX - startPoint.x;
    const dy = currentY - startPoint.y;
    // Side length is the maximum of the differences
    const side = Math.max(dx, dy);
    setBoundingBox({
      x0: startPoint.x,
      y0: startPoint.y,
      x1: startPoint.x + side,
      y1: startPoint.y + side,
    });
  };

  const handleMouseUp = (event) => {
    if (!isDrawing || !startPoint || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = Math.round(event.clientX - rect.left);
    const currentY = Math.round(event.clientY - rect.top);

    const dx = currentX - startPoint.x;
    const dy = currentY - startPoint.y;
    const side = Math.max(dx, dy);

    setIsDrawing(false);
    setBoundingBox({
      x0: startPoint.x,
      y0: startPoint.y,
      x1: startPoint.x + side,
      y1: startPoint.y + side,
    });
  };

  // Finalize box if mouse leaves image area while drawing
  const handleMouseLeave = (event) => {
    if (isDrawing) {
      handleMouseUp(event);
    }
  };

  // 🟢 Preview mask using the bounding box
  const handlePreviewMask = async () => {
    if (!image || !boundingBox)
      return alert("Select an image and draw a bounding box!");

    const formData = new FormData();
    formData.append("file", image);
    // Send bounding box coordinates as a comma-separated string "x0,y0,x1,y1"
    formData.append(
      "box_coordinates",
      `${boundingBox.x0},${boundingBox.y0},${boundingBox.x1},${boundingBox.y1}`
    );

    try {
      const response = await axios.post("http://localhost:8087/preview-mask/", formData, { responseType: "blob" });
      setMaskPreview(URL.createObjectURL(response.data));
    } catch (error) {
      alert("Error generating mask: " + (error.response?.data?.message || error.message));
    }
  };

  // 🟢 Submit image for AI generation with the bounding box
  const handleSubmit = async () => {
    if (!image || !prompt || !boundingBox)
      return alert("Please upload an image, draw a bounding box, and enter a prompt!");

    const formData = new FormData();
    formData.append("file", image);
    formData.append("prompt", prompt);
    formData.append(
      "box_coordinates",
      `${boundingBox.x0},${boundingBox.y0},${boundingBox.x1},${boundingBox.y1}`
    );

    try {
      const response = await axios.post("http://localhost:8087/stylize-image/", formData, { responseType: "blob" });
      setResultImage(URL.createObjectURL(response.data));
      fetchHistory();
    } catch (error) {
      alert("Error generating image: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <h1 className="text-4xl font-bold text-gray-800 mb-6">🎨 AI Image Styler</h1>

      <input
        type="file"
        className="border p-2 mb-4 rounded bg-white shadow-md"
        onChange={handleImageUpload}
      />
      <input
        type="text"
        placeholder="Enter style prompt (e.g., Van Gogh)"
        className="border p-2 mb-4 w-96 rounded shadow-md"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="flex space-x-4">
        <button className="bg-gray-500 text-white px-4 py-2 rounded shadow-md" onClick={handlePreviewMask}>
          Preview Mask
        </button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded shadow-md" onClick={handleSubmit}>
          Generate Image
        </button>
      </div>

      {progress > 0 && <p className="text-gray-600 mt-2">Generating: {progress}% complete</p>}

      {imagePreview && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Draw a square bounding box on the image</h2>
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Uploaded"
              ref={imageRef}
              className="border cursor-crosshair max-w-xs"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              draggable={false} // disable default drag behavior
            />
            {/* Display the drawn square */}
            {boundingBox && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(boundingBox.x0, boundingBox.x1),
                  top: Math.min(boundingBox.y0, boundingBox.y1),
                  width: Math.abs(boundingBox.x1 - boundingBox.x0),
                  height: Math.abs(boundingBox.y1 - boundingBox.y0),
                  border: "2px solid red",
                  pointerEvents: "none",
                }}
              ></div>
            )}
            {boundingBox && (
              <p className="mt-2 text-gray-500">
                Selected Box: {boundingBox.x0}, {boundingBox.y0} to {boundingBox.x1}, {boundingBox.y1}
              </p>
            )}
          </div>
        </div>
      )}

      {maskPreview && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Generated Mask Preview</h2>
          <img src={maskPreview} alt="Mask Preview" className="border max-w-xs" />
        </div>
      )}

      {resultImage && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <img src={resultImage} alt="AI Generated" className="border max-w-xs" />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Previously Generated Images</h2>
          <div className="grid grid-cols-3 gap-4">
            {history.map((img, idx) => (
              <img key={idx} src={img.image_url} alt="AI Image" className="border w-32 h-32 object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
