// Explicit catalog image import; application startup never rewrites product data.
const fs = require('node:fs');
const path = require('node:path');
const { connect, settings } = require('./sqlserver-connection.cjs');
require('dotenv').config({ quiet: true });

(async () => {
  if (!process.argv.includes('--apply')) throw new Error('Usage: node scripts/import-product-images.cjs --apply');
  const root = path.resolve(__dirname, '..');
  const images = JSON.parse(fs.readFileSync(path.join(root, 'public/product-images.json'), 'utf8'));
  for (const image of images) {
    if (!/^[1-9]\d*$/.test(image.id) || image.filename !== `product-${image.id}.webp` || !fs.existsSync(path.join(root, 'public/products', image.filename))) throw new Error('Invalid or missing product image');
  }
  const sql = require(settings().driver === 'windows' ? 'mssql/msnodesqlv8' : 'mssql');
  const pool = await connect();
  const transaction = new sql.Transaction(pool);
  let committed = false;
  try {
    await transaction.begin();
    const changed = [];
    for (const image of images) {
      const request = new sql.Request(transaction).input('id', sql.BigInt, image.id);
      const result = await request.query('SELECT p.name,i.id AS imageId,i.image_url AS imageUrl FROM dbo.products p WITH(UPDLOCK,HOLDLOCK) OUTER APPLY (SELECT TOP(1) id,image_url FROM dbo.product_images WHERE product_id=p.id ORDER BY is_primary DESC,id) i WHERE p.id=@id');
      const current = result.recordset[0];
      // Match the intended product and preserve any photo entered by the user.
      if (!current || current.name !== image.name || (current.imageUrl && !/^https:\/\/(?:placehold\.co|picsum\.photos)\//.test(current.imageUrl))) continue;
      const imageUrl = `/media/products/${image.filename}`;
      const update = new sql.Request(transaction).input('id', sql.BigInt, image.id).input('imageId', sql.BigInt, current.imageId ?? null).input('url', sql.NVarChar(2000), imageUrl)
        .input('before', sql.NVarChar(sql.MAX), JSON.stringify({ imageUrl: current.imageUrl ?? null }))
        .input('after', sql.NVarChar(sql.MAX), JSON.stringify({ imageUrl, source: image.source.page ?? image.source.url, match: image.match }));
      await update.query(`
        IF @imageId IS NULL INSERT dbo.product_images(product_id,image_url,is_primary) VALUES(@id,@url,1);
        ELSE UPDATE dbo.product_images SET image_url=@url,is_primary=1 WHERE id=@imageId;
        UPDATE dbo.products SET updated_at=SYSUTCDATETIME() WHERE id=@id;
        INSERT dbo.audit_logs(action,entity_type,entity_id,old_data,new_data) VALUES('PRODUCT_IMAGES_IMPORTED','PRODUCT',@id,@before,@after);
      `);
      changed.push(image.id);
    }
    await transaction.commit(); committed = true;
    console.log(JSON.stringify({ updated: changed.length, unchanged: images.length - changed.length }));
  } finally {
    if (!committed) await transaction.rollback().catch(() => {});
    await pool.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
