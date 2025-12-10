"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface UseBarcodeSccannerOptions {
  /** Callback when a barcode is successfully scanned */
  onScan?: (barcode: string, format: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Frames per second for scanning (default: 10) */
  fps?: number;
}

export interface UseBarcodeScannerReturn {
  /** Whether the scanner is currently active */
  isScanning: boolean;
  /** The last scanned barcode */
  lastBarcode: string | null;
  /** The format of the last scanned barcode */
  lastFormat: string | null;
  /** Available video input devices */
  devices: MediaDeviceInfo[];
  /** Currently selected device ID */
  selectedDeviceId: string | null;
  /** Error message if any */
  error: string | null;
  /** ID for the scanner container element */
  scannerId: string;
  /** Start scanning with the selected device */
  startScanning: (deviceId?: string) => Promise<void>;
  /** Stop scanning */
  stopScanning: () => Promise<void>;
  /** Select a different camera device */
  selectDevice: (deviceId: string) => void;
  /** Clear the last scanned barcode */
  clearBarcode: () => void;
  /** Request camera permissions and get available devices */
  requestPermissions: () => Promise<boolean>;
}

// Generate unique ID for scanner element
const generateScannerId = () => `barcode-scanner-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Hook for scanning barcodes using the device camera.
 * Uses html5-qrcode library for better mobile support.
 */
export function useBarcodeScanner(
  options: UseBarcodeSccannerOptions = {}
): UseBarcodeScannerReturn {
  const { onScan, onError, fps = 10 } = options;

  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [lastFormat, setLastFormat] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerId] = useState(generateScannerId);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef<boolean>(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  // Stop scanning
  const stopScanning = useCallback(async () => {
    scanningRef.current = false;
    setIsScanning(false);

    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // Ignore errors during cleanup
      }
    }
  }, []);

  // Initialize scanner instance
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          // Ignore
        }
        scannerRef.current = null;
      }
    };
  }, []);

  // Check if camera API is available
  const isCameraAvailable = useCallback((): boolean => {
    if (typeof navigator === "undefined") return false;
    if (!navigator.mediaDevices) return false;
    if (!navigator.mediaDevices.getUserMedia) return false;
    return true;
  }, []);

  // Request camera permissions and enumerate devices
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Check if camera API is available (requires HTTPS or localhost)
      if (!isCameraAvailable()) {
        const errorMsg = "Camera not available. Please use HTTPS or access from localhost.";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        return false;
      }

      // Get available video devices using html5-qrcode
      const videoDevices = await Html5Qrcode.getCameras();

      if (videoDevices.length === 0) {
        const errorMsg = "No cameras found";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        return false;
      }

      // Convert to MediaDeviceInfo-like format
      const devices = videoDevices.map((device) => ({
        deviceId: device.id,
        label: device.label,
        kind: "videoinput" as MediaDeviceKind,
        groupId: "",
        toJSON: () => ({}),
      }));
      setDevices(devices);

      // Select the back camera by default (environment facing)
      const backCamera = videoDevices.find(
        (device) =>
          device.label.toLowerCase().includes("back") ||
          device.label.toLowerCase().includes("rear") ||
          device.label.toLowerCase().includes("environment")
      );
      if (backCamera) {
        setSelectedDeviceId(backCamera.id);
      } else if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].id);
      }

      return true;
    } catch (err) {
      console.error("[useBarcodeScanner] Permission error:", err);
      const errorMsg = err instanceof Error ? err.message : "Camera permission denied";
      setError(errorMsg);
      onErrorRef.current?.(errorMsg);
      return false;
    }
  }, [isCameraAvailable]);

  // Start scanning
  const startScanning = useCallback(
    async (deviceId?: string) => {
      // Check if camera API is available
      if (!isCameraAvailable()) {
        const errorMsg = "Camera not available. Please use HTTPS or access from localhost.";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        return;
      }

      const targetDeviceId = deviceId || selectedDeviceId;
      if (!targetDeviceId) {
        const errorMsg = "No camera device selected";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        return;
      }

      // Check if scanner element exists
      const scannerElement = document.getElementById(scannerId);
      if (!scannerElement) {
        const errorMsg = "Scanner element not found";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        return;
      }

      try {
        setError(null);
        setIsScanning(true);
        scanningRef.current = true;

        // Create new scanner instance
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            scannerRef.current.clear();
          } catch {
            // Ignore
          }
        }

        // Supported barcode formats
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];

        scannerRef.current = new Html5Qrcode(scannerId, {
          formatsToSupport,
          verbose: false,
        });

        await scannerRef.current.start(
          targetDeviceId,
          {
            fps,
            qrbox: { width: 250, height: 150 },
          },
          (decodedText, decodedResult) => {
            // Success callback
            const format = decodedResult.result.format?.formatName || "UNKNOWN";

            setLastBarcode(decodedText);
            setLastFormat(format);
            onScanRef.current?.(decodedText, format);

            // Stop scanning after successful scan
            stopScanning();
          },
          () => {
            // Error callback - called on each frame without barcode
            // Silently continue scanning
          }
        );
      } catch (err) {
        console.error("[useBarcodeScanner] Start error:", err);
        const errorMsg = err instanceof Error ? err.message : "Failed to start camera";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
        setIsScanning(false);
        scanningRef.current = false;
      }
    },
    [selectedDeviceId, isCameraAvailable, fps, scannerId, stopScanning]
  );

  // Select device
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // Clear barcode
  const clearBarcode = useCallback(() => {
    setLastBarcode(null);
    setLastFormat(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    isScanning,
    lastBarcode,
    lastFormat,
    devices,
    selectedDeviceId,
    error,
    scannerId,
    startScanning,
    stopScanning,
    selectDevice,
    clearBarcode,
    requestPermissions,
  };
}
