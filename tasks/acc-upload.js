import { DataManagementClient, JsonApiVersionValue, TypeFolderItemsForStorage, TypeObject, TypeItem, TypeVersion, TypeFolder } from '@aps_sdk/data-management';
import { OssClient } from '@aps_sdk/oss';

// Replace these with your ACC credentials and project details
// ACC "AEC DM Developer Advocacy Support"
// https://acc.autodesk.com/account-admin/projects/accounts/238cb7ac-5f66-4da7-9c8d-b99f6f87ecdf/active
// ACC "DAS Project" 
// https://acc.autodesk.com/docs/files/projects/2def426a-c49a-4c35-9d9a-0290e254fc1d?folderUrn=urn%3Aadsk.wipprod%3Afs.folder%3Aco.UsB53XBJRImqqduVL3GDKA&viewModel=detail&moduleId=folders
const PROJECT_ID = 'b.2def426a-c49a-4c35-9d9a-0290e254fc1d';
const FOLDER_ID = 'urn:adsk.wipprod:fs.folder:co.UsB53XBJRImqqduVL3GDKA'; // Project Files

// BIM360 "Autodesk Forge Partner Development" https://admin.b360.autodesk.com/admin/a4f95080-84fe-4281-8d0a-bd8c885695e0/settings 
// BIM360 "Adam SSA Test" https://docs.b360.autodesk.com/projects/d98509df-1574-46a1-85c4-d0a0ce3428ef/folders/urn:adsk.wipprod:fs.folder:co.tUhinaeaTBObFwfQp3vqJA/detail
//const PROJECT_ID = 'b.d98509df-1574-46a1-85c4-d0a0ce3428ef'; // Adam SSA Test
//const FOLDER_ID = 'urn:adsk.wipprod:fs.folder:co.tUhinaeaTBObFwfQp3vqJA'; // Project Files

const FILE_PATH = '/Users/adamnagy/Adam/GitHub/local-tests/tasks/acc-upload-test.txt';
const EXTENSION_TYPE = 'autodesk.bim360'; // 'autodesk.core' for ACC?

export default async function uploadToAcc(accessToken) {
  try {
    // Step 1: Create a storage location
    const storageData = await createStorage(PROJECT_ID, FOLDER_ID, FILE_PATH.split('/').pop(), accessToken);
    const storageLocation = storageData.data.id;

    // Step 2: Upload the file
    const bucketKey = storageLocation.split('/')[0].split(':')[3];
    const objectKey = storageLocation.split('/')[1];
    const uploadData = await uploadFile(bucketKey, objectKey, FILE_PATH, accessToken);

    console.log('Upload response status:', uploadData.objectId);

    // Step 3: Create new version
    await createItem(PROJECT_ID, FOLDER_ID, FILE_PATH.split('/').pop(), storageLocation, accessToken);

    console.log('File uploaded successfully to ACC!');
  } catch (error) {
    console.error('Error uploading file to ACC:', error.response?.data || error.message);
  }
}

async function createStorage(projectId, folderId, fileName, accessToken) {
  const dataManagementClient = new DataManagementClient();

  const createStorage = {
    jsonapi: {
      version: JsonApiVersionValue._10
    },
    data: {
      type: TypeObject.Objects,
      attributes: {
        name: fileName
      },
      relationships: {
        target: {
          data: {
            type: TypeFolderItemsForStorage.Folders,
            id: folderId
          }
        }
      }
    }
  }

  const storage = await dataManagementClient.createStorage(projectId, createStorage, { accessToken: accessToken });
  console.log(storage);

  return storage;
}

async function uploadFile(bucketKey, objectKey, filePath, accessToken) {
  const ossClient = new OssClient();

  const response = await ossClient.uploadObject(bucketKey, objectKey, filePath, { accessToken: accessToken });

  return response;
}

async function createItem(projectId, folderId, fileName, storageId, accessToken) {
  const dataManagementClient = new DataManagementClient();

  let itemPayload = {
    jsonapi: { version: JsonApiVersionValue._10 },
    data: {
      type: TypeItem.Items,
      attributes: {
        displayName: fileName,
        extension: {
          type: `items:${EXTENSION_TYPE}:File`,
          version: "1.0",
        },
      },
      relationships: {
        tip: {
          data: {
            type: TypeVersion.Versions,
            id: "1",
          },
        },
        parent: {
          data: {
            type: TypeFolder.Folders, // need to change to enum
            id: folderId,
          },
        },
      },
    },
    included: [
      {
        type: TypeVersion.Versions,
        id: "1",
        attributes: {
          name: fileName,
          extension: {
            type: `versions:${EXTENSION_TYPE}:File`,
            version: '1.0'
          },
        },
        relationships: {
          storage: {
            data: {
              type: TypeObject.Objects,
              id: storageId
            }
          }
        }
      },
    ],
  };
  const createdItem = await dataManagementClient.createItem(projectId, itemPayload, { accessToken: accessToken });
  console.log(createdItem);

  return createdItem;
}