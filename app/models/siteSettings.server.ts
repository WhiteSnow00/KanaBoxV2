import { getDb } from "~/utils/db.server";

const SETTINGS_COLLECTION = "settings";
const SITE_SETTINGS_ID = "site";

interface SiteSettingsDocument {
  _id: typeof SITE_SETTINGS_ID;
  publicSiteDisabled: boolean;
  updatedAt: Date;
}

export interface SiteSettings {
  publicSiteDisabled: boolean;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const settings = await db
    .collection<SiteSettingsDocument>(SETTINGS_COLLECTION)
    .findOne({ _id: SITE_SETTINGS_ID });

  return {
    // A new installation starts with the inactive page enabled.
    publicSiteDisabled: settings?.publicSiteDisabled ?? true,
  };
}

export async function setPublicSiteDisabled(
  publicSiteDisabled: boolean
): Promise<SiteSettings> {
  const db = await getDb();

  await db.collection<SiteSettingsDocument>(SETTINGS_COLLECTION).updateOne(
    { _id: SITE_SETTINGS_ID },
    {
      $set: {
        publicSiteDisabled,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return { publicSiteDisabled };
}
