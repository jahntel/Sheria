/**
 * Specialized utility to load PDF.js from CDN and extract text on the client side.
 * Bypasses reading the binary file as raw text, ensuring precise extraction.
 */

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

let loadingPromise: Promise<any> | null = null;

export const loadPdfJS = (): Promise<any> => {
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("PDF.js loaded but pdfjsLib is not defined on window."));
      }
    };
    script.onerror = (err) => {
      loadingPromise = null; // allow retry
      reject(new Error("Failed to load PDF.js from CDN. Check your network connection."));
    };
    document.head.appendChild(script);
  });

  return loadingPromise;
};

export const extractTextFromPdf = async (file: File, onProgress?: (percent: number) => void): Promise<string> => {
  const pdfjsLib = await loadPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  
  // Track loading progress if desired
  loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
    if (onProgress && progressData.total > 0) {
      const percent = Math.round((progressData.loaded / progressData.total) * 100);
      onProgress(percent);
    }
  };

  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Join items with spaces, preserving visual lines where possible
    let lastY = -1;
    let pageText = "";
    
    for (const item of textContent.items as any[]) {
      if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += "\n";
      } else if (pageText.length > 0 && !pageText.endsWith("\n") && !pageText.endsWith(" ")) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    
    if (onProgress) {
      onProgress(Math.round((i / pdf.numPages) * 100));
    }
  }

  return fullText.trim();
};
