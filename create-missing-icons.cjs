const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Создание недостающих иконок...');

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Проверяем, есть ли утилита для работы с изображениями
try {
  // Проверяем, установлен ли ImageMagick
  execSync('magick --version', { stdio: 'ignore' });
  console.log('✓ ImageMagick найден');
  
  // Создаем недостающие размеры из 128x128@2x.png (256x256)
  const sourceFile = path.join(iconsDir, '128x128@2x.png');
  
  if (fs.existsSync(sourceFile)) {
    console.log('✓ Найден исходный файл 256x256 (128x128@2x.png)');
    
    // Создаем 64x64
    const size64 = path.join(iconsDir, '64x64.png');
    execSync(`magick convert "${sourceFile}" -resize 64x64 "${size64}"`);
    console.log('✓ Создан 64x64.png');
    
    // Создаем 256x256 (явно)
    const size256 = path.join(iconsDir, '256x256.png');
    fs.copyFileSync(sourceFile, size256);
    console.log('✓ Создан 256x256.png');
    
    // Обновляем ICO файл с новыми размерами
    console.log('\nОбновление ICO файла...');
    const icoFile = path.join(iconsDir, 'icon.ico');
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngFiles = sizes.map(size => path.join(iconsDir, `${size}x${size}.png`)).join(' ');
    
    execSync(`magick convert ${pngFiles} "${icoFile}"`);
    console.log(`✓ Обновлен ${icoFile}`);
    
  } else {
    console.log('✗ Файл 128x128@2x.png не найден');
  }
  
} catch (error) {
  console.log('✗ ImageMagick не найден, используем альтернативный подход');
  
  // Просто копируем существующие файлы и создаем заглушки для недостающих
  console.log('\nСоздание базовых иконок...');
  
  // Создаем простой текстовый файл с инструкциями
  const instructions = `
# Инструкция по улучшению иконок для Windows

Проблема: Иконки в Windows Taskbar отображаются в плохом разрешении.

Решение:

1. Используйте онлайн-конвертер для создания высококачественных иконок:
   - Перейдите на https://convertio.co/svg-ico/
   - Загрузите файл blum-avatar.svg
   - Выберите размеры: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
   - Скачайте полученный ICO файл

2. Замените существующие файлы:
   - Замените src-tauri/icons/icon.ico на новый файл
   - При необходимости обновите PNG файлы соответствующих размеров

3. Соберите приложение:
   npm run tauri build

После этого иконки в Windows Taskbar будут отображаться в высоком качестве.
`;
  
  fs.writeFileSync('icon-improvement-instructions.txt', instructions);
  console.log('✓ Создан файл с инструкциями: icon-improvement-instructions.txt');
}

console.log('\n✅ Завершено!');