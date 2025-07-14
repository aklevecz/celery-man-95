# macOS Image Generation App - Development Plan

## Project Overview
Rebuild the current SvelteKit image generation app as a native macOS application using Swift and SwiftUI, starting with FAL API integration for image generation.

## Phase 1: Foundation Setup

### Project Configuration
- **Target**: macOS 14.0+ (Sonoma)
- **Language**: Swift 6.0
- **UI Framework**: SwiftUI
- **Architecture**: MVVM pattern
- **Storage**: Core Data + FileManager
- **Security**: Keychain for API keys

### Initial Xcode Project Structure
```
ImageGenApp/
├── App/
│   ├── ImageGenAppApp.swift          // Main app entry point
│   └── ContentView.swift             // Root view
├── Models/
│   ├── ImageGenerationRequest.swift  // API request models
│   ├── FALResponse.swift             // API response models
│   └── SavedImage.swift              // Core Data model
├── ViewModels/
│   ├── ImageGenerationViewModel.swift // Main generation logic
│   └── SettingsViewModel.swift       // Settings management
├── Views/
│   ├── ImageGenerationView.swift     // Main generation interface
│   ├── ImageGalleryView.swift        // Saved images grid
│   └── SettingsView.swift            // API key configuration
├── Services/
│   ├── FALAPIManager.swift           // FAL API networking
│   ├── ImageStorage.swift            // Local image management
│   └── KeychainManager.swift         // Secure storage
└── Resources/
    ├── ImageGenApp.xcdatamodeld      // Core Data model
    └── Assets.xcassets               // App icons, colors
```

## Phase 2: Core Data Models

### ImageGenerationRequest.swift
```swift
struct ImageGenerationRequest: Codable {
    let prompt: String
    let aspectRatio: String
    let outputFormat: String
    let numImages: Int
    let enableSafetyChecker: Bool
    let safetyTolerance: String
    let raw: Bool
    let model: String
    let imageUrl: String? // For image-to-image
    
    enum CodingKeys: String, CodingKey {
        case prompt
        case aspectRatio = "aspect_ratio"
        case outputFormat = "output_format"
        case numImages = "num_images"
        case enableSafetyChecker = "enable_safety_checker"
        case safetyTolerance = "safety_tolerance"
        case raw
        case model
        case imageUrl = "image_url"
    }
}
```

### FALResponse.swift
```swift
struct FALResponse: Codable {
    let images: [GeneratedImage]
    let requestId: String?
    
    enum CodingKeys: String, CodingKey {
        case images
        case requestId = "request_id"
    }
}

struct GeneratedImage: Codable {
    let url: String
    let width: Int?
    let height: Int?
}
```

### SavedImage.swift (Core Data Entity)
```swift
import CoreData
import Foundation

@objc(SavedImage)
public class SavedImage: NSManagedObject {
    @NSManaged public var id: UUID
    @NSManaged public var prompt: String
    @NSManaged public var timestamp: Date
    @NSManaged public var filename: String
    @NSManaged public var aspectRatio: String
    @NSManaged public var model: String
    @NSManaged public var provider: String
    @NSManaged public var hasReferenceImage: Bool
}

extension SavedImage: Identifiable {
    // Core Data automatically provides ID functionality
}
```

## Phase 3: Networking Layer

### FALAPIManager.swift
```swift
import Foundation

@MainActor
class FALAPIManager: ObservableObject {
    private let baseURL = "https://fal.run/fal-ai"
    private let session = URLSession.shared
    
    @Published var isGenerating = false
    @Published var error: String?
    
    func generateImage(request: ImageGenerationRequest, model: String) async throws -> FALResponse {
        isGenerating = true
        defer { isGenerating = false }
        
        // Construct endpoint URL
        let endpoint = "/\(model)"
        guard let url = URL(string: baseURL + endpoint) else {
            throw APIError.invalidURL
        }
        
        // Create request
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication
        if let apiKey = KeychainManager.shared.getAPIKey() {
            urlRequest.setValue("Key \(apiKey)", forHTTPHeaderField: "Authorization")
        } else {
            throw APIError.missingAPIKey
        }
        
        // Encode request body
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        // Perform request
        let (data, response) = try await session.data(for: urlRequest)
        
        // Handle response
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.httpError(httpResponse.statusCode)
        }
        
        // Decode response
        return try JSONDecoder().decode(FALResponse.self, from: data)
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case missingAPIKey
    case invalidResponse
    case httpError(Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .missingAPIKey:
            return "API key not configured"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP error: \(code)"
        }
    }
}
```

## Phase 4: ViewModels

### ImageGenerationViewModel.swift
```swift
import Foundation
import SwiftUI

@MainActor
class ImageGenerationViewModel: ObservableObject {
    @Published var prompt: String = ""
    @Published var aspectRatio: String = "16:9"
    @Published var model: String = "fal-ai/flux-pro/v1.1-ultra"
    @Published var generatedImages: [GeneratedImageData] = []
    @Published var isGenerating: Bool = false
    @Published var error: String?
    
    private let apiManager = FALAPIManager()
    private let imageStorage = ImageStorage.shared
    
    let aspectRatioOptions = [
        ("21:9", "21:9 (Ultrawide)"),
        ("16:9", "16:9 (Widescreen)"),
        ("4:3", "4:3 (Standard)"),
        ("1:1", "1:1 (Square)"),
        ("3:4", "3:4 (Portrait)"),
        ("9:16", "9:16 (Vertical)")
    ]
    
    let modelOptions = [
        ("fal-ai/flux-pro/v1.1-ultra", "FLUX Pro 1.1 Ultra"),
        ("fal-ai/flux-pro/kontext", "FLUX Pro Kontext")
    ]
    
    func generateImage() async {
        guard !prompt.isEmpty else {
            error = "Please enter a prompt"
            return
        }
        
        isGenerating = true
        error = nil
        
        do {
            let request = ImageGenerationRequest(
                prompt: prompt,
                aspectRatio: aspectRatio,
                outputFormat: "jpeg",
                numImages: 1,
                enableSafetyChecker: false,
                safetyTolerance: "6",
                raw: false,
                model: model,
                imageUrl: nil
            )
            
            let response = try await apiManager.generateImage(request: request, model: model)
            
            // Process generated images
            for generatedImage in response.images {
                let imageData = GeneratedImageData(
                    url: generatedImage.url,
                    prompt: prompt,
                    aspectRatio: aspectRatio,
                    model: model
                )
                generatedImages.append(imageData)
                
                // Save to storage
                await imageStorage.saveImage(imageData)
            }
            
        } catch {
            self.error = error.localizedDescription
        }
        
        isGenerating = false
    }
}

struct GeneratedImageData: Identifiable {
    let id = UUID()
    let url: String
    let prompt: String
    let aspectRatio: String
    let model: String
    let timestamp = Date()
}
```

## Phase 5: UI Implementation

### ContentView.swift
```swift
import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = ImageGenerationViewModel()
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationSplitView {
            // Sidebar
            List(selection: $selectedTab) {
                Label("Generate", systemImage: "wand.and.stars")
                    .tag(0)
                Label("Gallery", systemImage: "photo.on.rectangle.angled")
                    .tag(1)
                Label("Settings", systemImage: "gear")
                    .tag(2)
            }
            .navigationTitle("Image Generator")
        } detail: {
            // Main content
            Group {
                switch selectedTab {
                case 0:
                    ImageGenerationView()
                        .environmentObject(viewModel)
                case 1:
                    ImageGalleryView()
                case 2:
                    SettingsView()
                default:
                    ImageGenerationView()
                        .environmentObject(viewModel)
                }
            }
        }
        .frame(minWidth: 800, minHeight: 600)
    }
}
```

### ImageGenerationView.swift
```swift
import SwiftUI

struct ImageGenerationView: View {
    @EnvironmentObject var viewModel: ImageGenerationViewModel
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack {
                Text("Image Generation")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Text("Create images with AI")
                    .foregroundColor(.secondary)
            }
            
            // Generation Form
            VStack(alignment: .leading, spacing: 16) {
                // Prompt Input
                VStack(alignment: .leading) {
                    Text("Prompt")
                        .font(.headline)
                    TextField("Enter your image description...", text: $viewModel.prompt, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...)
                }
                
                // Aspect Ratio
                VStack(alignment: .leading) {
                    Text("Aspect Ratio")
                        .font(.headline)
                    Picker("Aspect Ratio", selection: $viewModel.aspectRatio) {
                        ForEach(viewModel.aspectRatioOptions, id: \.0) { option in
                            Text(option.1).tag(option.0)
                        }
                    }
                    .pickerStyle(.menu)
                }
                
                // Model Selection
                VStack(alignment: .leading) {
                    Text("Model")
                        .font(.headline)
                    Picker("Model", selection: $viewModel.model) {
                        ForEach(viewModel.modelOptions, id: \.0) { option in
                            Text(option.1).tag(option.0)
                        }
                    }
                    .pickerStyle(.menu)
                }
                
                // Generate Button
                Button(action: {
                    Task {
                        await viewModel.generateImage()
                    }
                }) {
                    HStack {
                        if viewModel.isGenerating {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                        Text(viewModel.isGenerating ? "Generating..." : "Generate Image")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isGenerating || viewModel.prompt.isEmpty)
            }
            .padding()
            .background(Color(NSColor.controlBackgroundColor))
            .cornerRadius(12)
            
            // Error Display
            if let error = viewModel.error {
                Text(error)
                    .foregroundColor(.red)
                    .padding()
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
            }
            
            // Generated Images
            if !viewModel.generatedImages.isEmpty {
                ScrollView {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 200))], spacing: 16) {
                        ForEach(viewModel.generatedImages) { imageData in
                            AsyncImage(url: URL(string: imageData.url)) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                            } placeholder: {
                                ProgressView()
                                    .frame(width: 200, height: 200)
                            }
                            .cornerRadius(8)
                            .shadow(radius: 4)
                        }
                    }
                    .padding()
                }
            }
            
            Spacer()
        }
        .padding()
    }
}
```

## Phase 6: Security & Storage

### KeychainManager.swift
```swift
import Foundation
import Security

class KeychainManager {
    static let shared = KeychainManager()
    private let service = "com.yourcompany.imagegenapp"
    private let account = "fal-api-key"
    
    private init() {}
    
    func saveAPIKey(_ key: String) -> Bool {
        let data = key.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]
        
        // Delete existing item
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    func getAPIKey() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        guard status == errSecSuccess,
              let data = item as? Data,
              let key = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return key
    }
    
    func deleteAPIKey() -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess
    }
}
```

## Implementation Steps

### Step 1: Initial Setup
1. Create new macOS app project in Xcode
2. Set deployment target to macOS 14.0
3. Add Core Data model file
4. Create the basic folder structure

### Step 2: Basic UI
1. Implement ContentView with NavigationSplitView
2. Create ImageGenerationView with form controls
3. Add basic SettingsView for API key input

### Step 3: Networking
1. Implement FALAPIManager with URLSession
2. Add KeychainManager for secure storage
3. Create data models for API requests/responses

### Step 4: Image Generation
1. Wire up the generation form to API calls
2. Implement image display with AsyncImage
3. Add error handling and loading states

### Step 5: Storage & Gallery
1. Set up Core Data for metadata
2. Implement local image file storage
3. Create gallery view with saved images

## Testing Checklist

- [ ] API key storage and retrieval
- [ ] Image generation with different models
- [ ] Aspect ratio variations work correctly
- [ ] Images save locally and appear in gallery
- [ ] Error handling for network issues
- [ ] App launches and UI is responsive
- [ ] Settings persistence across app restarts

## Future Enhancements

1. **Lighting Studio equivalent** - Multiple lighting presets
2. **Batch operations** - Generate multiple variations
3. **Export functionality** - Save to user's Pictures folder
4. **Image-to-image** - Upload reference images
5. **Menu bar integration** - Quick generation from anywhere
6. **Spotlight integration** - Search saved images
7. **Share extensions** - Generate from other apps

This plan provides a solid foundation for creating a native macOS version of your image generation app, starting with core FAL API functionality and building up to match the current web app's features.