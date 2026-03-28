#!/usr/bin/env swift
// ╔══════════════════════════════════════════════════════════════╗
// ║  CRYPTIQ SHIELD — Face enrollment & verification helper     ║
// ║  For TERMIJUMP by MindSpark                                 ║
// ╚══════════════════════════════════════════════════════════════╝
//
// Compile:
//   swiftc -swift-version 5 -O -o /tmp/termijump-shield/shield \
//     termijump-shield.swift \
//     -framework AVFoundation -framework Vision -framework CoreImage
//
// Usage:
//   ./shield status   → {"enrolled": true/false}
//   ./shield enroll   → captures face, saves landmarks
//   ./shield verify   → captures face, compares with enrolled
//   ./shield clear    → removes enrolled data

import Foundation
import AVFoundation
import Vision
import CoreImage

// ═══════════════════════════════════════════════════════════════
//  PATHS
// ═══════════════════════════════════════════════════════════════
let shieldData = (NSHomeDirectory() as NSString).appendingPathComponent(".termijump-shield")
let enrollPath = (shieldData as NSString).appendingPathComponent("face.json")
let command = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "status"

// ═══════════════════════════════════════════════════════════════
//  JSON OUTPUT
// ═══════════════════════════════════════════════════════════════
func emit(_ dict: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: dict),
       let str = String(data: data, encoding: .utf8) {
        print(str)
    }
}

// ═══════════════════════════════════════════════════════════════
//  FACE DATA
// ═══════════════════════════════════════════════════════════════
struct FaceData: Codable {
    let points: [[Double]]
}

func saveFace(_ points: [[Double]]) {
    let data = FaceData(points: points)
    let encoder = JSONEncoder()
    encoder.outputFormatting = .prettyPrinted
    if let json = try? encoder.encode(data) {
        try? json.write(to: URL(fileURLWithPath: enrollPath))
    }
}

func loadFace() -> [[Double]]? {
    guard let raw = try? Data(contentsOf: URL(fileURLWithPath: enrollPath)),
          let face = try? JSONDecoder().decode(FaceData.self, from: raw) else { return nil }
    return face.points
}

// ═══════════════════════════════════════════════════════════════
//  CAMERA CAPTURE
// ═══════════════════════════════════════════════════════════════
class PhotoCapture: NSObject, AVCapturePhotoCaptureDelegate {
    private let sem = DispatchSemaphore(value: 0)
    private var imageData: Data?

    func capture() -> CGImage? {
        let session = AVCaptureSession()
        session.sessionPreset = .photo

        // Prefer front camera, fall back to default
        guard let device = AVCaptureDevice.default(
                    .builtInWideAngleCamera, for: .video, position: .front)
                  ?? AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            return nil
        }

        let output = AVCapturePhotoOutput()
        session.addInput(input)
        session.addOutput(output)
        session.startRunning()

        // Camera warm-up + auto-exposure settle
        Thread.sleep(forTimeInterval: 1.5)

        let settings = AVCapturePhotoSettings()
        output.capturePhoto(with: settings, delegate: self)

        let result = sem.wait(timeout: .now() + 10)
        session.stopRunning()

        guard result == .success, let data = imageData else { return nil }
        guard let ciImage = CIImage(data: data) else { return nil }
        return CIContext().createCGImage(ciImage, from: ciImage.extent)
    }

    func photoOutput(_ output: AVCapturePhotoOutput,
                     didFinishProcessingPhoto photo: AVCapturePhoto,
                     error: Error?) {
        imageData = photo.fileDataRepresentation()
        sem.signal()
    }
}

// ═══════════════════════════════════════════════════════════════
//  FACE LANDMARK EXTRACTION
// ═══════════════════════════════════════════════════════════════
func extractLandmarks(from image: CGImage) -> [[Double]]? {
    let request = VNDetectFaceLandmarksRequest()
    let handler = VNImageRequestHandler(cgImage: image, options: [:])

    do { try handler.perform([request]) }
    catch { return nil }

    guard let face = request.results?.first as? VNFaceObservation,
          let lm = face.landmarks else { return nil }

    var pts: [[Double]] = []

    // Collect all available landmark regions (normalized to face bounding box)
    let regions: [VNFaceLandmarkRegion2D?] = [
        lm.faceContour,
        lm.leftEye, lm.rightEye,
        lm.leftEyebrow, lm.rightEyebrow,
        lm.nose, lm.noseCrest, lm.medianLine,
        lm.outerLips, lm.innerLips,
        lm.leftPupil, lm.rightPupil
    ]

    for region in regions {
        guard let r = region else { continue }
        let points = r.normalizedPoints
        for p in points {
            pts.append([Double(p.x), Double(p.y)])
        }
    }

    return pts.isEmpty ? nil : pts
}

// ═══════════════════════════════════════════════════════════════
//  FACE COMPARISON
// ═══════════════════════════════════════════════════════════════
func compareFaces(_ enrolled: [[Double]], _ current: [[Double]]) -> Double {
    let count = min(enrolled.count, current.count)
    guard count > 10 else { return 0 }

    // Compute centroid of each face for alignment
    var exC = 0.0, eyC = 0.0, cxC = 0.0, cyC = 0.0
    for i in 0..<count {
        exC += enrolled[i][0]; eyC += enrolled[i][1]
        cxC += current[i][0]; cyC += current[i][1]
    }
    exC /= Double(count); eyC /= Double(count)
    cxC /= Double(count); cyC /= Double(count)

    // Compute scale (spread) of each face
    var eSpread = 0.0, cSpread = 0.0
    for i in 0..<count {
        let edx = enrolled[i][0] - exC, edy = enrolled[i][1] - eyC
        let cdx = current[i][0] - cxC, cdy = current[i][1] - cyC
        eSpread += sqrt(edx * edx + edy * edy)
        cSpread += sqrt(cdx * cdx + cdy * cdy)
    }
    eSpread /= Double(count)
    cSpread /= Double(count)

    guard eSpread > 0.001 && cSpread > 0.001 else { return 0 }

    // Compare normalized (centered + scaled) landmarks
    var totalDist = 0.0
    for i in 0..<count {
        let enx = (enrolled[i][0] - exC) / eSpread
        let eny = (enrolled[i][1] - eyC) / eSpread
        let cnx = (current[i][0] - cxC) / cSpread
        let cny = (current[i][1] - cyC) / cSpread
        let dx = enx - cnx, dy = eny - cny
        totalDist += sqrt(dx * dx + dy * dy)
    }

    let avgDist = totalDist / Double(count)
    // Same person typically < 0.15, different person > 0.35
    let score = max(0, min(1, 1.0 - avgDist * 2.5))
    return score
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
try? FileManager.default.createDirectory(
    atPath: shieldData, withIntermediateDirectories: true)

switch command {

case "status":
    let enrolled = FileManager.default.fileExists(atPath: enrollPath)
    emit(["enrolled": enrolled])

case "enroll":
    let cam = PhotoCapture()
    guard let image = cam.capture() else {
        emit(["error": "camera_failed"]); exit(1)
    }
    guard let points = extractLandmarks(from: image) else {
        emit(["error": "no_face"]); exit(1)
    }
    saveFace(points)
    emit(["success": true, "points": points.count])

case "verify":
    guard let enrolled = loadFace() else {
        emit(["error": "not_enrolled"]); exit(1)
    }
    let cam = PhotoCapture()
    guard let image = cam.capture() else {
        emit(["error": "camera_failed"]); exit(1)
    }
    guard let current = extractLandmarks(from: image) else {
        emit(["error": "no_face"]); exit(1)
    }
    let score = compareFaces(enrolled, current)
    emit(["match": score > 0.60, "score": round(score * 1000) / 1000])

case "clear":
    try? FileManager.default.removeItem(atPath: shieldData)
    emit(["cleared": true])

default:
    emit(["error": "unknown_command: \(command)"]); exit(1)
}
