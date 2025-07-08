import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || '2025-07-08';
    
    // Vercel環境に応じて設定を変更
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('環境チェック:', { NODE_ENV: process.env.NODE_ENV, isProduction });
    
    // デバッグ用：常に本番環境モードでテスト
    const forceProduction = true;
    
    if (isProduction || forceProduction) {
      console.log('本番環境モードでスクレイピングを開始します');
      // Vercel本番環境用の設定
      let executablePath;
      
      // Vercel環境かローカル Docker環境かを判定
      if (process.env.VERCEL) {
        executablePath = await chromium.executablePath();
        console.log('Vercel環境でChromiumパスを取得:', executablePath);
      } else {
        // ローカル Docker環境
        executablePath = '/usr/bin/chromium-browser';
        console.log('Docker環境でChromiumパスを設定:', executablePath);
      }
      
      console.log('Puppeteer起動設定:', {
        executablePath,
        isVercel: !!process.env.VERCEL,
        args: process.env.VERCEL ? 'chromium.args' : 'custom args'
      });
      
      // 基本的な設定でテスト
      const launchOptions = {
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      };

      console.log('Puppeteer起動設定詳細:', JSON.stringify(launchOptions, null, 2));
      
      const browser = await puppeteer.launch(launchOptions);
      
      console.log('Puppeteer起動成功');

      const page = await browser.newPage();
      console.log('新しいページを作成しました');

      // ページエラーをキャッチ
      page.on('error', (err) => {
        console.error('ページエラー:', err);
      });

      page.on('pageerror', (err) => {
        console.error('ページ内JavaScriptエラー:', err);
      });
      
      try {
        console.log('ページ遷移開始...');
        
        // まずシンプルなgotoでテスト
        const response = await page.goto('https://www.cm1.eprs.jp/kariya/web/view/user/homeIndex.html?te-uniquekey=1797e47d977', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        console.log('初期ページ読み込み完了 - ステータス:', response?.status());
        
        // ページのタイトルを取得
        const title = await page.title();
        console.log('ページタイトル:', title);
        
        // ページの完全なHTMLを取得（構造解析用）
        const fullHTML = await page.content();
        console.log('ページの完全なHTML（最初の2000文字）:', fullHTML.substring(0, 2000));
        
        // 利用可能なリンクとボタンを全て取得（img要素も含める）
        const availableElements = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a')).map(a => ({
            type: 'link',
            href: a.href,
            text: a.textContent?.trim(),
            id: a.id,
            className: a.className,
            imgAlt: a.querySelector('img')?.alt || ''
          }));
          
          const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(btn => ({
            type: 'button',
            text: btn.textContent?.trim() || (btn as HTMLInputElement).value,
            id: btn.id,
            className: btn.className,
            name: (btn as HTMLInputElement).name
          }));
          
          const forms = Array.from(document.querySelectorAll('form')).map(form => ({
            type: 'form',
            action: form.action,
            method: form.method,
            id: form.id,
            className: form.className
          }));
          
          const images = Array.from(document.querySelectorAll('img')).map(img => ({
            type: 'image',
            src: img.src,
            alt: img.alt,
            id: img.id,
            className: img.className,
            parentLink: img.closest('a')?.href || ''
          }));
          
          return { links, buttons, forms, images };
        });
        
        console.log('利用可能な要素:', JSON.stringify(availableElements, null, 2));
        
        // 「目的や人数から」に相当するリンクを探す（img要素のalt属性も含める）
        const categoryLink = availableElements.links.find(link => 
          link.text?.includes('目的や人数から') || 
          link.imgAlt?.includes('目的や人数から') ||
          link.href?.includes('category') ||
          link.href?.includes('purpose')
        );
        
        // 画像から直接該当するリンクを探す
        const imageLink = availableElements.images.find(img =>
          img.alt?.includes('目的や人数から')
        );
        
        if (!categoryLink && !imageLink) {
          // リンクが見つからない場合、直接フォームを探す
          console.log('目的や人数からのリンクが見つからないため、直接バドミントン検索を試行します');
          
          // バドミントンの入力フィールドやボタンを探す
          const badmintonElements = await page.evaluate(() => {
            const allInputs = Array.from(document.querySelectorAll('input, select, button'));
            return allInputs.map(el => ({
              tag: el.tagName,
              type: (el as HTMLInputElement).type || '',
              value: (el as HTMLInputElement).value || '',
              text: el.textContent?.trim() || '',
              name: (el as HTMLInputElement).name || '',
              id: el.id || '',
              className: el.className || ''
            })).filter(el => 
              el.value?.includes('バドミントン') ||
              el.text?.includes('バドミントン') ||
              el.name?.includes('badminton') ||
              el.id?.includes('badminton')
            );
          });
          
          console.log('バドミントン関連要素:', JSON.stringify(badmintonElements, null, 2));
          
        } else {
          const linkToClick = categoryLink || imageLink;
          console.log('目的や人数からのリンク/画像を発見:', linkToClick);
          
          if (categoryLink) {
            console.log('リンクをクリックします:', categoryLink.href);
            await page.goto(categoryLink.href, { waitUntil: 'domcontentloaded' });
          } else if (imageLink && imageLink.parentLink) {
            console.log('画像の親リンクをクリックします:', imageLink.parentLink);
            await page.goto(imageLink.parentLink, { waitUntil: 'domcontentloaded' });
          }
          
          console.log('カテゴリーページに遷移しました');
          
          // バドミントンを選択
          const badmintonSelector = await page.evaluate(() => {
            // より詳細にバドミントン関連の要素を探す
            const allInputs = Array.from(document.querySelectorAll('input[type="checkbox"], input[type="radio"]'));
            console.log('利用可能な入力要素数:', allInputs.length);
            
            for (const input of allInputs) {
              const inputElement = input as HTMLInputElement;
              const value = inputElement.value || '';
              const name = inputElement.name || '';
              const id = inputElement.id || '';
              
              // 隣接するテキストを確認（より広範囲に検索）
              const parent = inputElement.parentElement;
              const parentText = parent?.textContent?.trim() || '';
              const nextSibling = inputElement.nextElementSibling;
              const nextText = nextSibling?.textContent?.trim() || '';
              const prevSibling = inputElement.previousElementSibling;
              const prevText = prevSibling?.textContent?.trim() || '';
              
              // 祖父母要素も確認
              const grandParent = parent?.parentElement;
              const grandParentText = grandParent?.textContent?.trim() || '';
              
              // ラベル要素も確認
              let labelText = '';
              const label = document.querySelector(`label[for="${id}"]`);
              if (label) {
                labelText = label.textContent?.trim() || '';
              }
              
              console.log('入力要素チェック:', {
                value, name, id, parentText, nextText, prevText, grandParentText, labelText
              });
              
              // バドミントンを示すキーワードで検索（より厳密に）
              if (value.includes('バドミントン') || 
                  name.includes('バドミントン') ||
                  id.includes('バドミントン') ||
                  parentText.includes('バドミントン') ||
                  nextText.includes('バドミントン') ||
                  prevText.includes('バドミントン') ||
                  grandParentText.includes('バドミントン') ||
                  labelText.includes('バドミントン')) {
                console.log('バドミントン要素発見:', { value, name, id, selector: `input[value="${value}"]` });
                
                // valueが"true"のような汎用的な値の場合は、より具体的なセレクターを使用
                if (value === 'true' || value === '1' || value === 'on') {
                  if (name) return `input[name="${name}"]`;
                  if (id) return `#${id}`;
                  return `input[value="${value}"]`;
                } else {
                  return `input[value="${value}"]`;
                }
              }
            }
            
            // その他球技カテゴリ内でバドミントンを探す
            const categoryHeaders = Array.from(document.querySelectorAll('*')).filter(el => 
              el.textContent?.includes('その他球技') || el.textContent?.includes('球技'));
            
            for (const header of categoryHeaders) {
              console.log('球技カテゴリ発見:', header.textContent);
              // カテゴリセクション内でバドミントンを探す
              const section = header.closest('div, section, table') || header.parentElement;
              if (section) {
                const badmintonInputs = section.querySelectorAll('input');
                for (const input of badmintonInputs) {
                  const inputElement = input as HTMLInputElement;
                  const context = inputElement.parentElement?.textContent || '';
                  if (context.includes('バドミントン')) {
                    console.log('セクション内でバドミントン発見:', inputElement.value);
                    return `input[value="${inputElement.value}"]`;
                  }
                }
              }
            }
            
            return null;
          });
          
          if (badmintonSelector) {
            console.log('バドミントン選択肢が見つかりました:', badmintonSelector);
            await page.click(badmintonSelector);
            
            // 日付を入力（利用希望日の設定）
            console.log('利用希望日を設定します:', date);
            const dateInputExists = await page.evaluate((targetDate) => {
              const dateInputs = Array.from(document.querySelectorAll('input[type="text"], input[name*="date"], input[id*="date"]'));
              for (const input of dateInputs) {
                const inputElement = input as HTMLInputElement;
                if (inputElement.placeholder?.includes('年') || inputElement.name?.includes('date') || inputElement.id?.includes('date')) {
                  // 日付を YYYY/MM/DD 形式で入力
                  inputElement.value = targetDate.replace(/-/g, '/');
                  inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                  return true;
                }
              }
              return false;
            }, date);
            
            console.log('日付入力結果:', dateInputExists);
            
            // 検索実行ボタンを探す
            const searchButtonSelector = await page.evaluate(() => {
              // 検索ボタンを詳細に探す
              const buttons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
              
              for (const button of buttons) {
                const element = button as HTMLInputElement | HTMLButtonElement;
                const value = element.value || '';
                const text = element.textContent?.trim() || '';
                const name = element.name || '';
                const id = element.id || '';
                
                console.log('ボタンチェック:', { value, text, name, id });
                
                if (value.includes('検索') || 
                    text.includes('検索') ||
                    value.includes('上記の内容で検索する') ||
                    text.includes('上記の内容で検索する') ||
                    name.includes('search') ||
                    id.includes('search')) {
                  console.log('検索ボタン発見:', { value, text, name, id });
                  if (element.type === 'submit') {
                    return `input[type="submit"][value="${value}"]`;
                  } else if (element.name) {
                    return `[name="${element.name}"]`;
                  } else if (element.id) {
                    return `#${element.id}`;
                  } else {
                    return `button`;
                  }
                }
              }
              return null;
            });
            
            if (searchButtonSelector) {
              console.log('検索ボタンをクリックします:', searchButtonSelector);
              await page.click(searchButtonSelector);
              await page.waitForNavigation({ waitUntil: 'networkidle0' });
              console.log('検索を実行しました');
              
              // カレンダーから指定日付をクリック
              console.log('カレンダーから指定日付をクリックします:', date);
              
              const calendarClickResult = await page.evaluate((targetDate) => {
                // 指定日付を解析
                const dateObj = new Date(targetDate);
                const day = dateObj.getDate().toString();
                
                console.log('カレンダーで探す日付:', day);
                
                // カレンダー内の日付リンクを探す
                const calendarLinks = Array.from(document.querySelectorAll('a, td, .calendar a, .cal-day, [class*="day"], [class*="date"]'));
                
                console.log('カレンダー要素数:', calendarLinks.length);
                
                for (const link of calendarLinks) {
                  const text = link.textContent?.trim() || '';
                  const href = (link as HTMLAnchorElement).href || '';
                  const className = (link as HTMLElement).className || '';
                  
                  console.log('カレンダー要素チェック:', { text, href, className });
                  
                  // 日付とマッチする要素を探す
                  if (text === day || text === day.padStart(2, '0')) {
                    console.log('対象日付の要素発見:', { text, href, className });
                    
                    // クリック可能かチェック
                    if (href || (link as HTMLElement).onclick || className.includes('clickable') || className.includes('available')) {
                      console.log('クリック可能な日付要素をクリック:', text);
                      (link as HTMLElement).click();
                      return { success: true, day: text };
                    }
                  }
                }
                
                // より広範囲に検索（td内の日付）
                const tableCells = Array.from(document.querySelectorAll('td'));
                for (const cell of tableCells) {
                  const text = cell.textContent?.trim() || '';
                  if (text === day) {
                    const link = cell.querySelector('a');
                    if (link) {
                      console.log('テーブルセル内の日付リンクをクリック:', text);
                      link.click();
                      return { success: true, day: text };
                    } else if (cell.onclick || cell.style.cursor === 'pointer') {
                      console.log('クリック可能なセルをクリック:', text);
                      cell.click();
                      return { success: true, day: text };
                    }
                  }
                }
                
                return { success: false, message: '指定日付がカレンダーで見つかりません' };
              }, date);
              
              console.log('カレンダークリック結果:', calendarClickResult);
              
              if (calendarClickResult.success) {
                // カレンダークリック後にページの変更を待つ
                await new Promise(resolve => setTimeout(resolve, 2000));
                console.log('カレンダー日付クリック完了、ページ更新を待機中...');
              } else {
                console.log('カレンダー日付クリックに失敗:', calendarClickResult.message);
              }
              
              // 全ページの施設データを取得
              console.log('全ページの施設データ取得を開始します');
              const allFacilities: Array<{ name: string; availability: string; status: string }> = [];
              let currentPage = 1;
              let hasNextPage = true;
              
              while (hasNextPage) {
                console.log(`ページ${currentPage}のデータを取得中...`);
                
                // 現在のページから施設データを抽出（画像ベースの空き状況対応）
                const pageData = await page.evaluate((targetDate) => {
                  const facilities: Array<{ name: string; availability: string; status: string }> = [];
                  
                  console.log('=== 画像ベース空き状況解析を開始 ===');
                  console.log('対象日付:', targetDate);
                  console.log('現在のURL:', location.href);
                  
                  // 空きセルを処理する共通関数
                  function processAvailableCell(cell: Element, index: number) {
                    console.log(`=== 空きセル${index + 1}の解析 ===`);
                    
                    // セルを含む行を特定
                    const row = cell.closest('tr');
                    if (!row) {
                      console.log('行が見つかりません');
                      return;
                    }
                    
                    // セルを含むテーブルを特定
                    const table = cell.closest('table');
                    if (!table) {
                      console.log('テーブルが見つかりません');
                      return;
                    }
                    
                    console.log('セル内容:', cell.textContent?.trim());
                    console.log('行内容:', row.textContent?.trim());
                    
                    // 施設名を探す（同じテーブル内の●付きの行から）
                    let facilityName = '';
                    const tableRows = table.querySelectorAll('tr');
                    
                    for (const tableRow of tableRows) {
                      const rowText = tableRow.textContent?.trim() || '';
                      if (rowText.includes('●') && (rowText.includes('体育館') || rowText.includes('生涯学習') || rowText.includes('ホール') || rowText.includes('中学校'))) {
                        const facilityMatch = rowText.match(/●([^●]+)/);
                        if (facilityMatch) {
                          facilityName = facilityMatch[1].trim();
                          break;
                        }
                      }
                    }
                    
                    if (!facilityName) {
                      // ●が見つからない場合は、テーブル内の体育館等のキーワードから推測
                      const tableText = table.textContent || '';
                      if (tableText.includes('刈谷南中学校')) {
                        facilityName = '刈谷南中学校';
                      } else if (tableText.includes('刈谷南中体育館')) {
                        facilityName = '刈谷南中体育館';
                      } else if (tableText.includes('北部生涯学習センター')) {
                        facilityName = '北部生涯学習センター／体育室';
                      } else if (tableText.includes('南部生涯学習センター')) {
                        facilityName = '南部生涯学習センター／多目的ホール';
                      } else if (tableText.includes('体育館')) {
                        facilityName = '体育館';
                      } else if (tableText.includes('中学校')) {
                        facilityName = '中学校';
                      } else {
                        facilityName = '不明な施設';
                      }
                    }
                    
                    console.log('検出された施設名:', facilityName);
                    
                    // 時間帯の特定（time-table1, time-table2クラスまたは行内容から）
                    let timeSlot = '';
                    
                    // セルのクラスをチェック
                    const cellClasses = cell.className || '';
                    console.log('セルのクラス:', cellClasses);
                    
                    if (cellClasses.includes('time-table1') || cellClasses.includes('time-table2')) {
                      // time-tableクラスに対応する時間を特定
                      const rowCells = row.querySelectorAll('td, th');
                      const firstCell = rowCells[0];
                      if (firstCell) {
                        timeSlot = firstCell.textContent?.trim() || '';
                      }
                    }
                    
                    // 時間帯が特定できない場合は、行の最初のセルから推測
                    if (!timeSlot) {
                      const rowCells = row.querySelectorAll('td, th');
                      const firstCell = rowCells[0];
                      if (firstCell) {
                        const firstCellText = firstCell.textContent?.trim() || '';
                        if (firstCellText.includes('午前') || firstCellText.includes('午後') || firstCellText.includes('夜間') || firstCellText.match(/\d{1,2}:\d{2}/)) {
                          timeSlot = firstCellText;
                        }
                      }
                    }
                    
                    // セルの位置から時間帯を推測
                    if (!timeSlot) {
                      const rowCells = Array.from(row.querySelectorAll('td, th'));
                      const cellIndex = rowCells.indexOf(cell);
                      
                      // よくあるパターンに基づく推測
                      if (cellIndex === 1) {
                        timeSlot = '午前 9:00～12:00';
                      } else if (cellIndex === 2) {
                        timeSlot = '午後１ 12:00～15:00';
                      } else if (cellIndex === 3) {
                        timeSlot = '午後２ 15:00～18:00';
                      } else if (cellIndex === 4) {
                        timeSlot = '夜間 18:00～21:00';
                      } else {
                        timeSlot = `時間帯${cellIndex}`;
                      }
                    }
                    
                    console.log('検出された時間帯:', timeSlot);
                    
                    // 空き施設として追加
                    facilities.push({
                      name: `${facilityName}（${timeSlot}）`,
                      availability: '空きあり',
                      status: 'available'
                    });
                    
                    console.log(`*** 空き施設追加: ${facilityName}（${timeSlot}）`);
                  }
                  
                  // alt="空き"の画像を持つセルを探す（複数のパターンに対応）
                  const availableImages = Array.from(document.querySelectorAll('img[alt="空き"], img[alt="○"], img[alt="空"], img[src*="空き"], img[src*="available"]'));
                  console.log(`空き画像の数: ${availableImages.length}`);
                  
                  // 画像がない場合は、テキストベースで空き状況を探す
                  if (availableImages.length === 0) {
                    console.log('画像ベースの空き状況が見つからないため、テキストベースで検索します');
                    const availableCells = Array.from(document.querySelectorAll('td')).filter(cell => {
                      const text = cell.textContent?.trim() || '';
                      return text.includes('空き') || text.includes('○') || text.includes('空') || text === '◯';
                    });
                    console.log(`テキストベースの空きセル数: ${availableCells.length}`);
                    
                    availableCells.forEach((cell, index) => {
                      console.log(`=== テキストベース空きセル${index + 1}の解析 ===`);
                      console.log('セル内容:', cell.textContent?.trim());
                      
                      // 以下の処理は画像の場合と同じ
                      processAvailableCell(cell, index);
                    });
                  }
                  
                  availableImages.forEach((img, index) => {
                    console.log(`=== 空き画像${index + 1}の解析 ===`);
                    console.log('画像src:', (img as HTMLImageElement).src);
                    console.log('画像alt:', (img as HTMLImageElement).alt);
                    
                    // 画像を含むセルを特定
                    const cell = img.closest('td');
                    if (!cell) {
                      console.log('セルが見つかりません');
                      return;
                    }
                    
                    processAvailableCell(cell, index);
                  });
                  
                  // 満室画像の情報をログに出力（参考用）
                  const unavailableImages = Array.from(document.querySelectorAll('img[alt="満室"], img[alt="×"]'));
                  console.log(`満室画像の数: ${unavailableImages.length}`);
                  
                  console.log(`=== 最終結果: ${facilities.length}件の空き施設 ===`);
                  facilities.forEach(facility => {
                    console.log(`  ${facility.name}: ${facility.availability}`);
                  });
                  
                  return facilities;
                }, date);
                allFacilities.push(...pageData);
                
                console.log(`ページ${currentPage}: ${pageData.length}件の施設データを取得`);
                
                // 次のページへのリンクを探す
                const nextPageResult = await page.evaluate(() => {
                  // 「次の5件」や「>」ボタンを探す
                  const nextButtons = Array.from(document.querySelectorAll('a, button, input')).filter(element => {
                    const text = element.textContent?.trim() || '';
                    const value = (element as HTMLInputElement).value || '';
                    return text.includes('次の') || text.includes('次へ') || text === '>' || 
                           value.includes('次の') || value.includes('次へ') || value === '>';
                  });
                  
                  console.log(`次ページボタン候補: ${nextButtons.length}個発見`);
                  
                  for (const button of nextButtons) {
                    const text = button.textContent?.trim() || '';
                    const value = (button as HTMLInputElement).value || '';
                    const href = (button as HTMLAnchorElement).href || '';
                    
                    console.log('次ページボタンチェック:', { text, value, href });
                    
                    // クリック可能で、無効化されていないボタンを探す
                    if ((button as HTMLButtonElement).disabled === false || 
                        !(button as HTMLElement).classList.contains('disabled')) {
                      console.log('次ページボタンをクリック:', text || value);
                      (button as HTMLElement).click();
                      return { success: true, clicked: text || value };
                    }
                  }
                  
                  console.log('次ページボタンが見つからないか、すべて無効化されています');
                  return { success: false, message: '次ページが存在しません' };
                });
                
                if (nextPageResult.success) {
                  console.log('次ページへ移動しました:', nextPageResult.clicked);
                  // ページ読み込みを待つ
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  currentPage++;
                } else {
                  console.log('全ページの取得が完了しました');
                  hasNextPage = false;
                }
                
                // 安全のため、最大10ページまでとする
                if (currentPage > 10) {
                  console.log('最大ページ数に達したため、処理を終了します');
                  hasNextPage = false;
                }
              }
              
              console.log(`全${currentPage - 1}ページから合計${allFacilities.length}件の施設データを取得しました`);
              
              // 重複を除去
              const uniqueFacilities = allFacilities.filter((facility, index, self) => 
                index === self.findIndex(f => f.name === facility.name && f.availability === facility.availability)
              );
              
              console.log(`重複除去後: ${uniqueFacilities.length}件の施設データ`);
              
              await browser.close();
              
              return NextResponse.json({
                success: true,
                date,
                facilities: uniqueFacilities
              });
            } else {
              console.log('検索ボタンが見つかりませんでした');
              await browser.close();
              
              return NextResponse.json({
                success: true,
                date,
                facilities: []
              });
            }
          }
        }
        
      } catch (scrapeError) {
        await browser.close();
        throw scrapeError;
      }
    } else {
      console.log('開発環境モードでモックデータを返します');
      // 開発環境用モックデータ
      const mockFacilities = [
        {
          name: '刈谷市体育館 アリーナ',
          availability: '9:00-21:00 (一部空きあり)',
          status: 'available' as const
        },
        {
          name: '刈谷市総合運動公園体育館',
          availability: '満室',
          status: 'unavailable' as const
        },
        {
          name: '小垣江東小学校体育館',
          availability: '18:00-21:00 空きあり',
          status: 'available' as const
        }
      ];

      return NextResponse.json({
        success: true,
        date,
        facilities: mockFacilities
      });
    }
    
  } catch (error) {
    console.error('スクレイピングエラー詳細:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json({
      success: false,
      error: `データの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}