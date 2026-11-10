export interface DriveUserInfo {
  displayName: string;
  emailAddress: string;
  photoLink?: string;
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

// Format bytes into readable format
export function formatBytes(bytesStr?: string | number): string {
  if (!bytesStr) return "0 B";
  const bytes = typeof bytesStr === "string" ? parseInt(bytesStr, 10) : bytesStr;
  if (isNaN(bytes) || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Fetch user profile and storage quota from Google Drive API
export async function getDriveStorageQuota(accessToken: string): Promise<DriveUserInfo> {
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/about?fields=user,storageQuota",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Failed to fetch Drive quota (${res.status})`);
  }

  const data = await res.json();
  return {
    displayName: data.user?.displayName || "Google User",
    emailAddress: data.user?.emailAddress || "",
    photoLink: data.user?.photoLink,
    storageQuota: data.storageQuota,
  };
}

// Search for or create a folder in user's Google Drive
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string = "KhmerDownloader"
): Promise<string> {
  // Check if folder exists
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // If not found, create new folder
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to create folder in Google Drive");
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

// Upload video media to Google Drive
export async function uploadVideoToGoogleDrive(
  accessToken: string,
  params: {
    fileName: string;
    mimeType: string;
    blob: Blob;
    folderName?: string;
  }
): Promise<{ id: string; name: string; webViewLink: string; size?: string }> {
  const { fileName, mimeType, blob, folderName = "KhmerDownloader" } = params;

  // Step 1: Ensure destination folder exists
  const folderId = await findOrCreateFolder(accessToken, folderName);

  // Step 2: Use multipart upload to send metadata + file content in one request
  const metadata = {
    name: fileName,
    mimeType,
    parents: [folderId],
    description: "Saved via KhmerDownloader Pro",
  };

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaHeader = `${delimiter}Content-Type: ${mimeType}\r\n\r\n`;

  // Combine parts into multipart blob
  const multipartBlob = new Blob(
    [metadataPart, mediaHeader, blob, closeDelimiter],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,size,createdTime",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBlob,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Google Drive upload failed (${uploadRes.status})`);
  }

  const fileData = await uploadRes.json();
  const webViewLink =
    fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`;

  return {
    id: fileData.id,
    name: fileData.name,
    webViewLink,
    size: formatBytes(fileData.size || blob.size),
  };
}

// List videos uploaded to Google Drive
export async function listDriveSavedFiles(
  accessToken: string,
  folderName: string = "KhmerDownloader"
): Promise<DriveFileItem[]> {
  const folderId = await findOrCreateFolder(accessToken, folderName);
  const query = encodeURIComponent(
    `'${folderId}' in parents and trashed = false`
  );

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,mimeType,size,createdTime,webViewLink,iconLink,thumbnailLink)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to list Google Drive files");
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    ...f,
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    size: formatBytes(f.size),
  }));
}

// Delete file from Google Drive (MUST be preceded by user confirmation dialog)
export async function deleteDriveFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to delete file (${res.status})`);
  }
}
