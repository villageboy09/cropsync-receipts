// src/pages/AutoPrintReceipt.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logo from "/Logo.png";

/**
 * AutoPrintReceipt
 * - reads ?data=<base64-json>
 * - renders receipt (80mm x auto height)
 * - generates PDF (80 x 120 mm) and auto-prints
 */
export default function AutoPrintReceipt() {
  const containerRef = useRef(null);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  // Utility: safe base64 decode (handles URL encoded)
  function decodeBase64UrlSafe(s) {
    try {
      // s is rawurlencoded base64; decode first
      const decoded = decodeURIComponent(s);
      // Some systems produce URL-safe base64 (replace - _ back)
      const fixed = decoded.replace(/-/g, "+").replace(/_/g, "/");
      return atob(fixed);
    } catch (e) {
      // fallback try direct atob
      try { return atob(s); } catch (e2) { throw e; }
    }
  }

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("data");
      if (!raw) {
        setError("No data parameter found in URL.");
        return;
      }
      const jsonStr = decodeBase64UrlSafe(raw);
      const obj = JSON.parse(jsonStr);
      setPayload(obj);
    } catch (e) {
      console.error(e);
      setError("Failed to parse data payload: " + e.message);
    }
  }, []);

  // once payload exists, render then generate/print
  useEffect(() => {
    if (!payload || !containerRef.current) return;

    async function generateAndPrint() {
      try {
        // give browser a short moment to load fonts and images
        await new Promise((res) => setTimeout(res, 300));

        // html2canvas
        const canvas = await html2canvas(containerRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");

        // jsPDF with size 80x120 mm
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: [80, 120],
        });
        pdf.addImage(imgData, "PNG", 0, 0, 80, 120);

        // prefer blob URL and open a new window to print
        pdf.autoPrint();
        const blobUrl = pdf.output("bloburl");

        // Try to open new window/tab with blob URL
        const w = window.open(blobUrl, "_blank");
        if (w) {
          w.onload = () => {
            try {
              w.focus();
              w.print();
              // close print window after short delay
              setTimeout(() => w.close(), 1500);
              // try to close the current window (if opened by PHP)
              setTimeout(() => window.close(), 2000);
            } catch (e) {
              console.warn("Auto print failed:", e);
            }
          };
        } else {
          // Popup blocked — fallback to embed in iframe in same window
          const fallback = window.open("", "_blank");
          if (!fallback) {
            alert("Popup blocked and fallback failed. Please allow popups.");
            return;
          }
          const reader = new FileReader();
          const blob = await new Promise((resolve) => pdf.output('blob', (b) => resolve(b)));
          reader.onload = function (e) {
            fallback.document.write(`<iframe src="${e.target.result}" style="width:100%;height:100%;border:none;"></iframe>`);
            fallback.document.close();
            setTimeout(() => { try { fallback.focus(); fallback.print(); setTimeout(() => fallback.close(), 1500); } catch(e){console.warn(e);} }, 800);
          };
          reader.readAsDataURL(blob);
        }
      } catch (err) {
        console.error('Generate/print error', err);
        alert('Print failed: ' + err.message);
      }
    }

    generateAndPrint();
  }, [payload]);

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;
  }
  if (!payload) {
    return <div style={{ padding: 20 }}>Preparing receipt...</div>;
  }

  // destructure payload for easy use
  const { problem = {}, advisory = {}, components = [], receipt_id, generated_at } = payload;

  // The visible receipt (80mm width). Keep font sizes small for receipt
  return (
    <div style={{ padding: 12 }}>
      <div
        ref={containerRef}
        style={{
          width: '80mm',
          minHeight: '120mm',
          boxSizing: 'border-box',
          padding: '4mm',
          background: '#fff',
          color: '#000',
          fontSize: 10,
          lineHeight: 1.25,
          fontFamily: "'Noto Sans Telugu','PoppinsLocal', sans-serif",
        }}
      >
        {/* header */}
        <div style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 6 }}>
          <img src={logo} alt="logo" style={{ height: '18mm', objectFit: 'contain' }} />
          <div style={{ fontWeight: 700, fontSize: 13 }}>CropSync</div>
          <div style={{ fontSize: 8, fontStyle: 'italic' }}>Smart Agricultural Solutions</div>
          <div style={{ fontSize: 8 }}>www.cropsync.in | +91-9182867605</div>
        </div>

        {/* title */}
        <div style={{ textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: 700, fontFamily: "'Noto Sans Telugu'" }}>
          {problem.problem_name_te || problem.problem_name_en || 'Advisory'}
        </div>

        <div style={{ marginTop: 6, fontSize: 9 }}>
          <div><strong>Category:</strong> {problem.category || '-'}</div>
          <div><strong>Stage:</strong> {problem.stage_te || problem.stage_en || '-'}</div>
        </div>

        {/* symptoms */}
        {advisory.symptoms_te && (
          <>
            <div style={{ marginTop: 6, borderBottom: '1px solid #000', fontWeight: 700 }}>Symptoms</div>
            <div style={{ marginTop: 4, whiteSpace: 'pre-line', fontFamily: "'Noto Sans Telugu'" }}>
              {advisory.symptoms_te}
            </div>
          </>
        )}

        {/* advisory notes */}
        {advisory.notes_te && (
          <>
            <div style={{ marginTop: 6, borderBottom: '1px solid #000', fontWeight: 700 }}>Advisory</div>
            <div style={{ marginTop: 4, whiteSpace: 'pre-line', fontFamily: "'Noto Sans Telugu'" }}>
              {advisory.notes_te}
            </div>
          </>
        )}

        {/* components */}
        {components && components.length > 0 && (
          <>
            <div style={{ marginTop: 6, borderBottom: '1px solid #000', fontWeight: 700 }}>Treatment</div>
            <div style={{ marginTop: 4 }}>
              {components.map((c, i) => (
                <div key={i} style={{ border: '1px solid #ddd', padding: 4, marginBottom: 6 }}>
                  <div style={{ fontWeight: 700 }}>{c.component_type || '-'}</div>
                  <div style={{ fontFamily: "'Noto Sans Telugu'" }}>
                    <strong>Name:</strong> {c.component_name_te || c.component_name_en || '-'}
                  </div>
                  {c.dose_te && <div><strong>Dose:</strong> {c.dose_te}</div>}
                  {c.application_method_te && <div><strong>Method:</strong> {c.application_method_te}</div>}
                  {c.notes_te && <div><strong>Note:</strong> {c.notes_te}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* footer */}
        <div style={{ textAlign: 'center', marginTop: 8, borderTop: '1px dashed #000', paddingTop: 6, fontSize: 8 }}>
          <div>Receipt ID: {receipt_id}</div>
          <div>Date: {new Date(generated_at).toLocaleString('en-IN')}</div>
          <div>Thank you for using CropSync</div>
        </div>
      </div>

      {/* small fallback note — not shown in kiosk */}
      <div style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
        If printing doesn't start automatically, allow popups or press the print button in the new window.
      </div>
    </div>
  );
}
