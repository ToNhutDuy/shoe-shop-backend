

// Add this interface
export interface MediaVariation {
    path: string; // relative_path to this specific variation
    url?: string; // Full URL (can be generated on the fly or stored)
    width?: number;
    height?: number;
    size_bytes?: number;
    mime_type?: string;
}

// In your Media entity, adjust the 'variations' column type:
// ...

// ...