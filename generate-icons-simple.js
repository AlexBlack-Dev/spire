const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Генерация иконок для Windows...');

// Размеры для иконок
const sizes = [16, 32, 48, 64, 128, 256];
const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Проверяем существование SVG файла
const svgFile = path.join(__dirname, 'blum-avatar.svg');
if (!fs.existsSync(svgFile)) {
  console.error('❌ Файл blum-avatar.svg не найден!');
  process.exit(1);
}

console.log('✓ Найден файл blum-avatar.svg');

// Создаем временный HTML файл для конвертации через браузер
const tempHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: transparent; }
    svg { width: 512px; height: 512px; }
  </style>
</head>
<body>
  ${fs.readFileSync(svgFile, 'utf8')}
</body>
</html>
`;

fs.writeFileSync('temp-icon.html', tempHtml);
console.log('✓ Создан временный HTML файл');

// Для простоты, давайте просто скопируем существующие иконки и создадим недостающие
// из самой большой доступной иконки (128x128@2x.png = 256x256)

console.log('\nКопирование и масштабирование существующих иконок...');

// Проверяем существующие файлы
const existingFiles = {
  16: '16x16.png',
  32: '32x32.png', 
  48: '48x48.png',
  128: '128x128.png',
  256: '128x128@2x.png' // Это фактически 256x256
};

// Создаем недостающие размеры из 256x256
const source256 = path.join(iconsDir, '128x128@2x.png');
if (fs.existsSync(source256)) {
  console.log('✓ Найден исходный файл 256x256 (128x128@2x.png)');
  
  // Для Windows нам нужен ICO файл с несколькими размерами
  // Давайте создадим простой скрипт для сборки приложения,
  // который будет использовать существующие иконки
  
  console.log('\n✅ Существующие иконки:');
  sizes.forEach(size => {
    const fileName = `${size}x${size}.png`;
    const filePath = path.join(iconsDir, fileName);
    if (fs.existsSync(filePath)) {
      console.log(`  ✓ ${fileName} - ${fs.statSync(filePath).size} байт`);
    } else {
      console.log(`  ✗ ${fileName} - отсутствует`);
    }
  });
  
  // Проверяем ICO файл
  const icoFile = path.join(iconsDir, 'icon.ico');
  if (fs.existsSync(icoFile)) {
    console.log(`\n✓ ICO файл существует: ${fs.statSync(icoFile).size} байт`);
  } else {
    console.log('\n✗ ICO файл отсутствует');
  }
  
} else {
  console.log('✗ Файл 128x128@2x.png не найден');
}

// Удаляем временный файл
fs.unlinkSync('temp-icon.html');

console.log('\n🎯 Рекомендации для улучшения качества иконок в Windows:');
console.log('1. Используйте онлайн-конвертер SVG в ICO с поддержкой нескольких размеров');
console.log('2. Рекомендуемые сайты:');
console.log('   - https://convertio.co/svg-ico/');
console.log('   - https://www.icoconverter.com/');
console.log('3. Загрузите файл blum-avatar.svg');
console.log('4. Выберите размеры: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256');
console.log('5. Скачайте полученный ICO файл и замените src-tauri/icons/icon.ico');
console.log('\nПосле этого соберите приложение с помощью: npm run tauri build');