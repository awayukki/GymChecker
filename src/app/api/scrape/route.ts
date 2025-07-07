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
    
    if (isProduction) {
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
              
              // 隣接するテキストを確認
              const parent = inputElement.parentElement;
              const parentText = parent?.textContent?.trim() || '';
              const nextSibling = inputElement.nextElementSibling;
              const nextText = nextSibling?.textContent?.trim() || '';
              const prevSibling = inputElement.previousElementSibling;
              const prevText = prevSibling?.textContent?.trim() || '';
              
              console.log('入力要素チェック:', {
                value, name, id, parentText, nextText, prevText
              });
              
              // バドミントンを示すキーワードで検索
              if (value.includes('バドミントン') || 
                  name.includes('バドミントン') ||
                  id.includes('バドミントン') ||
                  parentText.includes('バドミントン') ||
                  nextText.includes('バドミントン') ||
                  prevText.includes('バドミントン')) {
                console.log('バドミントン要素発見:', { value, name, id });
                return `input[value="${value}"]`;
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
              
              // 検索結果ページのタイトルとURLを確認
              const resultPageInfo = await page.evaluate(() => ({
                title: document.title,
                url: location.href,
                hasTable: !!document.querySelector('table'),
                hasCalendar: !!document.querySelector('.calendar, #calendar'),
                hasResults: !!document.querySelector('.result, .search-result')
              }));
              
              console.log('検索結果ページ情報:', resultPageInfo);
              
              // 検索結果ページの詳細な内容を出力
              const pageContent = await page.evaluate(() => {
                const bodyText = document.body.textContent || '';
                const tables = Array.from(document.querySelectorAll('table')).map(table => ({
                  rows: table.querySelectorAll('tr').length,
                  cells: Array.from(table.querySelectorAll('td, th')).slice(0, 10).map(cell => cell.textContent?.trim())
                }));
                
                return {
                  bodyTextSample: bodyText.substring(0, 1000),
                  tablesInfo: tables
                };
              });
              
              console.log('検索結果ページの詳細:', pageContent);
            } else {
              console.log('検索ボタンが見つかりませんでした');
            }
          }
        }
        
        // 結果ページでのデータ抽出
        const facilityData = await page.evaluate(() => {
          const facilities: Array<{ name: string; availability: string; status: string }> = [];
          
          // 現在のページのタイトルとURLを確認
          console.log('現在のページ:', document.title, location.href);
          
          // 複数のパターンでテーブルやリストを探す
          const containers = document.querySelectorAll('table, #calendar, .calendar, .result, .facility-list, .search-result, .rsv-list');
          
          console.log(`発見されたコンテナ数: ${containers.length}`);
          
          for (const container of containers) {
            console.log('コンテナ解析中:', container.className, container.id);
            
            // テーブル形式の処理
            const rows = container.querySelectorAll('tr');
            if (rows.length > 0) {
              console.log(`テーブル発見 - 行数: ${rows.length}`);
              
              for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td, th');
                if (cells.length >= 2) {
                  const firstCell = cells[0]?.textContent?.trim();
                  const secondCell = cells[1]?.textContent?.trim();
                  
                  // 施設名らしいものを検出
                  if (firstCell && secondCell && 
                      (firstCell.includes('体育館') || firstCell.includes('アリーナ') || 
                       firstCell.includes('コート') || firstCell.includes('ホール'))) {
                    facilities.push({
                      name: firstCell,
                      availability: secondCell,
                      status: secondCell.includes('×') || secondCell.includes('満') || 
                              secondCell.includes('不可') ? 'unavailable' : 'available'
                    });
                  }
                }
              }
            }
            
            // リスト形式の処理
            const listItems = container.querySelectorAll('li, .facility-item, .rsv-item');
            for (const item of listItems) {
              const text = item.textContent?.trim();
              if (text && (text.includes('体育館') || text.includes('アリーナ') || 
                          text.includes('コート') || text.includes('ホール'))) {
                const nameMatch = text.match(/([^：]+(?:体育館|アリーナ|コート|ホール)[^：]*)/);
                const statusMatch = text.match(/(空き|満|×|○|利用可|利用不可)/);
                
                if (nameMatch) {
                  facilities.push({
                    name: nameMatch[1],
                    availability: statusMatch ? statusMatch[1] : text,
                    status: statusMatch && (statusMatch[1].includes('×') || statusMatch[1].includes('満') || 
                            statusMatch[1].includes('不可')) ? 'unavailable' : 'available'
                  });
                }
              }
            }
          }
          
          // 結果が見つからない場合は、ページ全体から施設情報を探す
          if (facilities.length === 0) {
            console.log('施設データが見つからないため、ページ全体を検索します');
            
            // カレンダー形式のデータを探す
            const calendarData = Array.from(document.querySelectorAll('td, .cal-cell, .date-cell')).map(cell => {
              const text = cell.textContent?.trim() || '';
              const hasTimeSlot = text.match(/\d{1,2}:\d{2}/);
              const hasStatus = text.includes('○') || text.includes('×') || text.includes('△');
              
              if (hasTimeSlot && hasStatus && text.length < 50) {
                return {
                  name: `刈谷市体育館（${text.match(/\d{1,2}:\d{2}[-~]\d{1,2}:\d{2}/) || 'バドミントン'}）`,
                  availability: text,
                  status: text.includes('×') ? 'unavailable' : 'available'
                };
              }
              return null;
            }).filter((item): item is { name: string; availability: string; status: string } => item !== null);
            
            facilities.push(...calendarData);
            
            // テーブル内の時間枠データを探す
            const timeSlotData = Array.from(document.querySelectorAll('tr')).map(row => {
              const cells = row.querySelectorAll('td, th');
              if (cells.length >= 2) {
                const timeCell = cells[0]?.textContent?.trim() || '';
                const statusCell = cells[1]?.textContent?.trim() || '';
                
                // 時間枠データらしいものを検出
                if (timeCell.match(/\d{1,2}:\d{2}/) && (statusCell.includes('○') || statusCell.includes('×') || statusCell.includes('△'))) {
                  return {
                    name: `バドミントン（${timeCell}）`,
                    availability: statusCell,
                    status: statusCell.includes('×') ? 'unavailable' : 'available'
                  };
                }
              }
              return null;
            }).filter((item): item is { name: string; availability: string; status: string } => item !== null);
            
            facilities.push(...timeSlotData);
            
            // 一般的な施設情報を探す
            if (facilities.length === 0) {
              const allText = document.body.textContent || '';
              const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
              
              for (const line of lines) {
                if ((line.includes('体育館') || line.includes('アリーナ') || 
                     line.includes('コート') || line.includes('ホール') ||
                     line.includes('バドミントン')) && 
                    line.length < 100) { // 長すぎる説明文は除外
                  facilities.push({
                    name: line,
                    availability: '確認が必要',
                    status: 'available'
                  });
                }
              }
            }
            
            
            // デバッグ情報を追加
            console.log('最終的な施設データ数:', facilities.length);
            if (facilities.length > 0) {
              console.log('施設データサンプル:', facilities.slice(0, 3));
            }
          }
          
          return facilities;
        });
        
        await browser.close();
        
        return NextResponse.json({
          success: true,
          date,
          facilities: facilityData
        });
        
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