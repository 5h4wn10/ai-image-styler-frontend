import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [maskPreview, setMaskPreview] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [resultImage, setResultImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [history, setHistory] = useState([]);
  const [boundingBox, setBoundingBox] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [strength, setStrength] = useState(0.4);
  const [guidance, setGuidance] = useState(8);
  const imageRef = useRef(null);

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

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setMaskPreview(null);
    setBoundingBox(null);
    setStartPoint(null);
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);
    setStartPoint({ x, y });
    setBoundingBox(null);
    setIsDrawing(true);
  };

  const handleMouseMove = (event) => {
    if (!isDrawing || !startPoint || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const currentX = Math.round(event.clientX - rect.left);
    const currentY = Math.round(event.clientY - rect.top);
    const dx = currentX - startPoint.x;
    const dy = currentY - startPoint.y;
    const side = Math.max(dx, dy);
    setBoundingBox({
      x0: startPoint.x,
      y0: startPoint.y,
      x1: startPoint.x + side,
      y1: startPoint.y + side,
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    }
  };

  const handlePreviewMask = async () => {
    if (!image || !boundingBox)
      return alert("Select an image and draw a bounding box!");

    const formData = new FormData();
    formData.append("file", image);
    formData.append(
      "box_coordinates",
      `${boundingBox.x0},${boundingBox.y0},${boundingBox.x1},${boundingBox.y1}`
    );

    try {
      const response = await axios.post(
        "http://localhost:8087/preview-mask/",
        formData,
        { responseType: "blob" }
      );
      setMaskPreview(URL.createObjectURL(response.data));
    } catch (error) {
      alert(
        "Error generating mask: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

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
      const response = await axios.post(
        "http://localhost:8087/stylize-image/",
        formData,
        { responseType: "blob" }
      );
      setResultImage(URL.createObjectURL(response.data));
      fetchHistory();
    } catch (error) {
      alert(
        "Error generating image: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleRobel = async () => {
    if (!image || !prompt) {
      return alert("Please upload an image and enter a prompt!");
    }
  
    const formData = new FormData();
    formData.append("file", image);
    formData.append("prompt", prompt);
    formData.append("strength", strength);
    formData.append("guidance", guidance);
  
    try {
      const response = await axios.post(
        "http://localhost:8087/stylize-imageStable/",
        formData,
        { responseType: "blob" } // Ensures image is returned as a file
      );
  
      setResultImage(URL.createObjectURL(response.data));
    } catch (error) {
      alert(
        "Error generating image: " + (error.response?.data?.message || error.message)
      );
    }
  };
  

  return (
    <div className="App">
      <h1>🎨 AI Image Styler</h1>

      <input type="file" className="file-input" onChange={handleImageUpload} />
      <input
        type="text"
        placeholder="Enter style prompt (e.g., Van Gogh)"
        className="text-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {/* 🟢 Strength & Guidance input fields */}
      <div className="strength-guidance-container">
        <div>
          <label className="input-label">Strength</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            className="text-input"
            value={strength}
            onChange={(e) => setStrength(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label className="input-label">Guidance</label>
          <input
            type="number"
            min="1"
            max="20"
            step="0.5"
            className="text-input"
            value={guidance}
            onChange={(e) => setGuidance(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="button-container">
        <button className="button1" onClick={handlePreviewMask}>
          Preview Mask
        </button>
        <button className="button2" onClick={handleSubmit}>
          Generate Image
        </button>
        <button className="button3" onClick={handleRobel}>
          Generate Full Image
        </button>
      </div>

      {progress > 0 && <p className="progress-text">Generating: {progress}% complete</p>}

      {imagePreview && (
        <div className="image-container">
          <h2>Draw a square bounding box on the image</h2>
          <div className="relative">
            <img
              src={imagePreview}
              alt="Uploaded"
              ref={imageRef}
              className="image-preview"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              draggable={false}
            />
            {boundingBox && (
              <div
                className="bounding-box"
                style={{
                  left: Math.min(boundingBox.x0, boundingBox.x1),
                  top: Math.min(boundingBox.y0, boundingBox.y1),
                  width: Math.abs(boundingBox.x1 - boundingBox.x0),
                  height: Math.abs(boundingBox.y1 - boundingBox.y0),
                }}
              ></div>
            )}
          </div>
        </div>
      )}

      {maskPreview && <img src={maskPreview} alt="Mask Preview" className="image-preview" />}
      {resultImage && <img src={resultImage} alt="AI Generated" className="image-preview" />}
    </div>
  );
}

export default App;
