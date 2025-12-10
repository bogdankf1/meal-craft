"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ScanBarcode,
  Camera,
  Loader2,
  CheckCircle,
  XCircle,
  RotateCcw,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useImportWizard, ParsedItem } from "./ImportWizard";

export interface BarcodeProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  quantity?: number;
  unit?: string;
}

interface BarcodeImportProps<T extends ParsedItem> {
  onLookupBarcode: (barcode: string) => Promise<BarcodeProductInfo | null>;
  onCreateItem: (product: BarcodeProductInfo) => T;
}

export function BarcodeImport<T extends ParsedItem>({
  onLookupBarcode,
  onCreateItem,
}: BarcodeImportProps<T>) {
  const t = useTranslations("import");
  const { setParsedItems, parsedItems, setStep, isProcessing, setIsProcessing } =
    useImportWizard<T>();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lookupResult, setLookupResult] = useState<{
    product: BarcodeProductInfo | null;
    notFound: boolean;
  } | null>(null);
  const [scannedItems, setScannedItems] = useState<T[]>([]);

  const {
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
  } = useBarcodeScanner({
    onScan: async (barcode) => {
      // Automatically lookup the barcode when scanned
      await handleLookup(barcode);
    },
  });

  // Request permissions on mount
  useEffect(() => {
    const init = async () => {
      const granted = await requestPermissions();
      setHasPermission(granted);
    };
    init();
  }, [requestPermissions]);

  const handleLookup = async (barcode: string) => {
    setIsProcessing(true);
    setLookupResult(null);

    try {
      const product = await onLookupBarcode(barcode);
      if (product) {
        setLookupResult({ product, notFound: false });
      } else {
        setLookupResult({
          product: { barcode, name: "" },
          notFound: true,
        });
      }
    } catch (err) {
      console.error("Failed to lookup barcode:", err);
      setLookupResult({
        product: { barcode, name: "" },
        notFound: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddItem = () => {
    if (!lookupResult?.product) return;

    const newItem = onCreateItem(lookupResult.product);
    setScannedItems((prev) => [...prev, newItem]);
    setLookupResult(null);
    clearBarcode();
  };

  const handleScanAnother = () => {
    setLookupResult(null);
    clearBarcode();
    startScanning();
  };

  const handleProceedToReview = () => {
    setParsedItems([...parsedItems, ...scannedItems]);
    setStep("review");
  };

  const handleStartScanning = () => {
    setLookupResult(null);
    clearBarcode();
    startScanning();
  };

  // Permission denied state
  if (hasPermission === false) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            {t("barcode.title")}
          </CardTitle>
          <CardDescription>{t("barcode.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <XCircle className="h-12 w-12 text-destructive" />
            <p className="text-center text-muted-foreground">
              {t("barcode.permissionDenied")}
            </p>
            <Button onClick={() => requestPermissions()}>
              {t("barcode.requestPermission")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading permission state
  if (hasPermission === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            {t("barcode.title")}
          </CardTitle>
          <CardDescription>{t("barcode.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{t("barcode.requestingPermission")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanBarcode className="h-5 w-5" />
          {t("barcode.title")}
        </CardTitle>
        <CardDescription>{t("barcode.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Camera selection */}
        {devices.length > 1 && !isScanning && !lookupResult && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("barcode.selectCamera")}</label>
            <Select value={selectedDeviceId || ""} onValueChange={selectDevice}>
              <SelectTrigger>
                <SelectValue placeholder={t("barcode.selectCameraPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Scanner viewport */}
        {!lookupResult && (
          <div className="relative">
            {/* Scanner container - html5-qrcode renders here */}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
              {/* This div is where html5-qrcode renders the video */}
              <div
                id={scannerId}
                className="w-full h-full"
                style={{ minHeight: "200px" }}
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Camera className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {/* Processing indicator */}
              {isScanning && isProcessing && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">{t("barcode.lookingUp")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Scanned barcode info */}
            {lastBarcode && !isProcessing && (
              <div className="mt-2 p-2 bg-muted rounded text-center">
                <p className="text-sm font-mono">{lastBarcode}</p>
                <p className="text-xs text-muted-foreground">{lastFormat}</p>
              </div>
            )}
          </div>
        )}

        {/* Lookup result */}
        {lookupResult && (
          <div className="space-y-4">
            {lookupResult.notFound ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <XCircle className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="font-medium">{t("barcode.notFound")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("barcode.notFoundDescription", { barcode: lookupResult.product?.barcode || "" })}
                  </p>
                </div>
                <Button variant="outline" onClick={handleScanAnother}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t("barcode.scanAnother")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-medium">{lookupResult.product?.name}</p>
                    {lookupResult.product?.brand && (
                      <p className="text-sm text-muted-foreground">
                        {lookupResult.product.brand}
                      </p>
                    )}
                    {lookupResult.product?.category && (
                      <p className="text-sm text-muted-foreground">
                        {t("barcode.category")}: {lookupResult.product.category}
                      </p>
                    )}
                    <p className="text-xs font-mono text-muted-foreground">
                      {lookupResult.product?.barcode}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddItem} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("barcode.addToList")}
                  </Button>
                  <Button variant="outline" onClick={handleScanAnother}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t("barcode.scanAnother")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start/Stop scanning button */}
        {!lookupResult && (
          <div className="flex justify-center">
            {isScanning ? (
              <Button variant="destructive" onClick={stopScanning}>
                {t("barcode.stopScanning")}
              </Button>
            ) : (
              <Button onClick={handleStartScanning} disabled={!selectedDeviceId}>
                <ScanBarcode className="h-4 w-4 mr-2" />
                {t("barcode.startScanning")}
              </Button>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        {/* Scanned items list */}
        {scannedItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {t("barcode.scannedItems", { count: scannedItems.length })}
              </p>
              <Button onClick={handleProceedToReview}>
                {t("barcode.proceedToReview")}
              </Button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scannedItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm"
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{(item as Record<string, unknown>).item_name as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hints */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-2">{t("barcode.hints.title")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("barcode.hints.hint1")}</li>
            <li>{t("barcode.hints.hint2")}</li>
            <li>{t("barcode.hints.hint3")}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
