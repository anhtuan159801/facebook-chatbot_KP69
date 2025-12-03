"""
SCRAPER THỦ TỤC HÀNH CHÍNH - TẤT CẢ BỘ/NGÀNH
=======================================================
✅ Chọn được bất kỳ Bộ/Ngành nào
✅ Tải file hướng dẫn (.doc)
✅ Mỗi thủ tục một folder riêng
✅ Ghi rõ tên thủ tục trong danh sách
✅ Thêm link thủ tục vào cuối file Word
✅ Auto convert .doc → .docx

CÀI ĐẶT:
  pip install selenium requests python-docx

  Windows: pip install pywin32
  Linux/Mac: sudo apt-get install libreoffice (hoặc brew install libreoffice)
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os
import re
import json
from urllib.parse import urljoin
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import subprocess
import platform
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import hashlib

# Danh sách các Bộ/Ngành
MINISTRIES = {
    "1": "Bộ Công an",
    "2": "Bộ Công thương",
    "3": "Bộ Dân tộc và Tôn giáo",
    "4": "Bộ Giáo dục và Đào tạo",
    "5": "Bộ Khoa học và Công nghệ",
    "6": "Bộ Ngoại giao",
    "7": "Bộ Nội vụ",
    "8": "Bộ Nông nghiệp và Môi trường",
    "9": "Bộ Quốc phòng",
    "10": "Bộ Tài chính",
    "11": "Bộ Tư pháp",
    "12": "Bộ Văn hóa, Thể thao và Du lịch",
    "13": "Bộ Y tế",
    "14": "Ngân hàng Chính sách xã hội",
    "15": "Ngân hàng Nhà nước Việt Nam",
    "16": "Ngân hàng phát triển Việt Nam",
    "17": "Thanh tra Chính phủ",
    "18": "Tòa án nhân dân",
    "19": "Tập đoàn Điện lực Việt Nam",
    "20": "Văn phòng Chính phủ"
}

class ProcedureScraper:
    """Class chính để scrape thủ tục hành chính"""

    def __init__(self, download_dir='downloads', max_workers=8, headless=True):
        self.download_dir = os.path.abspath(download_dir)
        os.makedirs(self.download_dir, exist_ok=True)

        self.max_workers = max_workers
        self.headless = headless
        self.stats = {'success': 0, 'failed': 0, 'cached': 0}
        self.stats_lock = threading.Lock()

        # Cache
        self.cache_file = 'cache_ministries.json'
        self.cache = self._load_cache()
        self.cache_lock = threading.Lock()

        # Main driver cho việc browse danh sách
        self.driver = self._create_driver()
        self.wait = WebDriverWait(self.driver, 15)

        # Session requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

        print(f"OK Khoi tao thanh cong")
        print(f"Folder: {self.download_dir}")
        print(f"Headless mode: {headless}")
        print(f"Max workers: {max_workers}\n")

    def _create_driver(self):
        """Tạo một Chrome driver mới"""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument('--headless=new')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option('excludeSwitches', ['enable-automation'])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        # Add performance optimizations
        chrome_options.add_argument('--disable-extensions')
        chrome_options.add_argument('--disable-plugins')
        chrome_options.add_argument('--disable-images')  # Don't load images to save bandwidth and speed up
        chrome_options.add_argument('--blink-settings=imagesEnabled=false')  # Alternative to disable images

        driver = webdriver.Chrome(options=chrome_options)
        driver.set_page_load_timeout(20)
        # Set script timeout
        driver.set_script_timeout(15)
        # Implicit wait for elements
        driver.implicitly_wait(5)
        return driver

    def _load_cache(self):
        """Load cache từ file"""
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except json.JSONDecodeError as e:
                print(f"Warning - Lỗi đọc file cache '{self.cache_file}': {e}. Tạo cache mới.")
                return {}
            except Exception as e:
                print(f"Warning - Lỗi không xác định khi tải cache '{self.cache_file}': {e}. Tạo cache mới.")
                return {}
        return {}

    def _save_cache(self):
        """Lưu cache ra file"""
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning - Không thể lưu cache: {e}")

    def setup_advanced_search(self, ministry_name):
        """
        Setup tìm kiếm nâng cao cho Bộ/Ngành cụ thể
        """
        try:
            # BƯỚC 1: Click "Tìm kiếm nâng cao"
            print(f"🔍 Bước 1: Click 'Tìm kiếm nâng cao'...", end=" ")
            # BƯỚC 1: Click "Tìm kiếm nâng cao"
            print(f"🔍 Bước 1: Click 'Tìm kiếm nâng cao'...", end=" ")
            try:
                adv_search = self.wait.until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, "div.adv"))
                )
                adv_search.click()
                # Wait for the select2 dropdown to become visible after clicking advanced search
                self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "span.select2-selection__rendered[id='select2-select-implementation-agency-container']")))
                print("✅")
            except TimeoutException:
                print("⚠️ (Có thể đã mở sẵn hoặc selector đã thay đổi)")
            except Exception as e:
                print(f"❌ Lỗi khi click tìm kiếm nâng cao: {e}")
                return False

            # BƯỚC 2: Chọn Bộ/Ngành từ dropdown Select2
            print(f"🏢 Bước 2: Chọn '{ministry_name}'...", end=" ")

            # Click vào dropdown Select2
            select2_container = self.wait.until(
                EC.element_to_be_clickable((
                    By.CSS_SELECTOR,
                    "span.select2-selection__rendered[id='select2-select-implementation-agency-container']"
                ))
            )
            select2_container.click()

            # Wait for search box or options to appear
            try:
                # Try to find and click the option directly
                option = self.wait.until(
                    EC.element_to_be_clickable((
                        By.XPATH,
                        f"//li[contains(@class, 'select2-results__option') and contains(text(), '{ministry_name}')]"
                    ))
                )
                option.click()
                print("✅")
            except TimeoutException:
                # Fallback: Use search box if direct click fails
                try:
                    search_box = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input.select2-search__field")))
                    search_box.send_keys(ministry_name)
                    option = self.wait.until(
                        EC.element_to_be_clickable((
                            By.XPATH,
                            "//li[contains(@class, 'select2-results__option')]"
                        ))
                    )
                    option.click()
                    print("✅")
                except Exception as e:
                    print(f"❌ Không chọn được: {e}")
                    return False

            # Wait for the select2 dropdown to close or become invisible
            self.wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, "input.select2-search__field")))

            # BƯỚC 3: Click nút "Tìm kiếm"
            print("🔎 Bước 3: Click nút 'Tìm kiếm'...", end=" ")
            search_btn = self.wait.until(
                EC.element_to_be_clickable((By.ID, "btn-search"))
            )
            search_btn.click()
            # Wait for the search results table to be present and contain data (or a loading indicator to disappear)
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr td a[href*='ma_thu_tuc=']")))
            print("✅")

            # BƯỚC 4: Chọn 50 hàng/trang
            print("📊 Bước 4: Chọn 50 hàng/trang...", end=" ")
            select_el = self.wait.until(
                EC.presence_of_element_located((By.ID, "paginationRecsPerPage"))
            )
            Select(select_el).select_by_value("50")
            # Wait for the table content to refresh after changing items per page
            # This is a generic wait, a more specific one could be to wait for the number of rows to change
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr td a[href*='ma_thu_tuc=']")))
            print("✅")

            print("✅ Setup hoàn tất!\n")
            return True

        except Exception as e:
            print(f"\n❌ Lỗi setup: {e}")
            import traceback
            traceback.print_exc()
            return False

    def get_current_page_number(self):
        """Lấy số trang hiện tại"""
        try:
            active = self.driver.find_element(By.CSS_SELECTOR, "li.active[jp-role='page']")
            return int(active.get_attribute('jp-data'))
        except NoSuchElementException:
            return 1 # Assume page 1 if active page element not found
        except ValueError:
            print(f"   ⚠️ Could not parse current page number, defaulting to 1.")
            return 1
        except Exception as e:
            print(f"   ❌ Error getting current page number: {e}, defaulting to 1.")
            return 1

    def get_total_pages(self):
        """Lấy tổng số trang"""
        try:
            last_btn = self.driver.find_element(By.CSS_SELECTOR, "li.last[jp-role='last']")
            total = int(last_btn.get_attribute('jp-data'))
            return total
        except NoSuchElementException:
            try:
                page_nums = self.driver.find_elements(By.CSS_SELECTOR, "li[jp-role='page']")
                if page_nums:
                    return max([int(p.get_attribute('jp-data')) for p in page_nums])
            except (NoSuchElementException, ValueError) as e:
                print(f"   ⚠️ Could not determine total pages from page numbers: {e}, defaulting to 1.")
            return 1 # Default to 1 if last page button or page numbers are not found
        except ValueError:
            print(f"   ⚠️ Could not parse total pages number, defaulting to 1.")
            return 1
        except Exception as e:
            print(f"   ❌ Error getting total pages: {e}, defaulting to 1.")
            return 1

    def go_to_next_page(self):
        """Chuyển sang trang tiếp theo"""
        try:
            current_page = self.get_current_page_number()
            print(f"   📄 Đang ở trang {current_page}, chuyển sang trang {current_page + 1}...", end=" ")

            next_btn = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "li.next:not(.disabled) a"))
            )
            next_btn.click()

            # Đợi cho đến khi số trang thay đổi
            try:
                self.wait.until(EC.text_to_be_present_in_element_attribute(
                    (By.CSS_SELECTOR, "li.active[jp-role='page']"), 'jp-data', str(current_page + 1)
                ))
                print(f"✅ Đã chuyển sang trang {current_page + 1}")
                # Optional: Add a small sleep if the page content takes a moment to fully render after the page number updates
                # time.sleep(1)
                return True
            except TimeoutException:
                print(f"⚠️ Timeout khi chuyển trang")
                return False

        except Exception as e:
            print(f"❌ Lỗi: {e}")
            return False

    def extract_procedures_from_page(self):
        """Lấy danh sách thủ tục từ trang hiện tại"""
        procedures = []
        seen_ids = set()

        try:
            # Wait for at least one procedure link to be present
            self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr td a[href*='ma_thu_tuc=']")))

            links = self.driver.find_elements(
                By.CSS_SELECTOR,
                "table tbody tr td a[href*='ma_thu_tuc=']"
            )

            print(f"   🔍 Tìm thấy {len(links)} links")

            for link in links:
                try:
                    href = link.get_attribute('href')
                    if not href:
                        print(f"   ⚠️ Link trống, bỏ qua.")
                        continue

                    match = re.search(r'ma_thu_tuc=(\d+)', href)
                    if not match:
                        print(f"   ⚠️ Không tìm thấy ma_thu_tuc trong link: {href}, bỏ qua.")
                        continue

                    proc_id = match.group(1)

                    if proc_id in seen_ids:
                        print(f"   ⚠️ Thủ tục trùng lặp ID: {proc_id}, bỏ qua.")
                        continue
                    seen_ids.add(proc_id)

                    # Lấy mã hiển thị
                    code = f"TTHC-{proc_id}" # Default value
                    try:
                        code_span = link.find_element(By.CSS_SELECTOR, "span.link.thick")
                        code = code_span.text.strip()
                    except NoSuchElementException:
                        pass # Use default code if thick span not found

                    # Lấy tên thủ tục (toàn bộ text trừ mã)
                    full_text = link.text.strip()
                    title = full_text.replace(code, '').strip()
                    if not title:
                        title = f"Thủ tục {proc_id}"
                        print(f"   ⚠️ Tên thủ tục trống, dùng mặc định: {title}")


                    procedures.append({
                        'id': proc_id,
                        'code': code,
                        'title': title,
                        'url': href
                    })

                except Exception as link_e:
                    print(f"   ❌ Lỗi khi xử lý link thủ tục: {link_e}")
                    continue

        except TimeoutException:
            print(f"   ⚠️ Timeout khi đợi bảng thủ tục. Có thể không có thủ tục nào trên trang này.")
        except Exception as e:
            print(f"   ⚠️ Lỗi chung khi extract thủ tục: {e}")

        return procedures

        return procedures

    def get_all_procedures(self, url, ministry_name):
        """Lấy tất cả thủ tục của một Bộ/Ngành"""
        print("="*70)
        print(f"🚀 BẮT ĐẦU LẤY DANH SÁCH THỦ TỤC - {ministry_name.upper()}")
        print("="*70)

        self.driver.get(url)
        self.wait.until(EC.presence_of_element_located((By.ID, "btn-search"))) # Wait for a key element to indicate page load

        if not self.setup_advanced_search(ministry_name):
            print("❌ Không thể setup tìm kiếm!")
            return []

        all_procedures = []
        total_pages = self.get_total_pages()
        current = self.get_current_page_number()

        print(f"📊 Tổng số trang: {total_pages}")
        print(f"📊 Trang hiện tại: {current}\n")

        for page_num in range(1, total_pages + 1):
            current_page = self.get_current_page_number()
            print(f"📄 Trang {current_page}/{total_pages}")

            procs = self.extract_procedures_from_page()

            if not procs:
                print("   ⚠️ Không lấy được thủ tục nào!")
                break

            all_procedures.extend(procs)
            print(f"   ✅ Lấy được {len(procs)} thủ tục | Tổng: {len(all_procedures)}\n")

            if page_num < total_pages:
                if not self.go_to_next_page():
                    print("   ⚠️ Dừng lại vì không thể chuyển trang\n")
                    break

        # Loại bỏ duplicate
        unique_dict = {}
        for p in all_procedures:
            if p['id'] not in unique_dict:
                unique_dict[p['id']] = p

        unique_procs = list(unique_dict.values())

        print(f"✅ TỔNG CỘNG: {len(unique_procs)} thủ tục duy nhất")
        if len(all_procedures) > len(unique_procs):
            print(f"   (Đã loại bỏ {len(all_procedures) - len(unique_procs)} duplicate)\n")

        return unique_procs

    def download_procedure_guide(self, procedure, ministry_folder):
        """
        Tải file hướng dẫn (.doc) của một thủ tục
        """
        proc_id = procedure['id']
        proc_code = procedure['code']
        proc_title = procedure['title']

        # Tạo folder cho Bộ/Ngành
        safe_code = re.sub(r'[^\w\-]', '_', proc_code)
        huong_dan_folder = os.path.join(ministry_folder, "huong_dan")
        os.makedirs(huong_dan_folder, exist_ok=True)

        # This function is not called in the main `run` loop, `download_procedure_parallel` is.
        # However, for consistency and robustness, we will update its cache logic to match
        # `download_procedure_parallel`. If this function were to be used, it would need its
        # own driver instance if used in parallel. For now, we assume it's used sequentially
        # and thus `self.driver` is acceptable.

        cache_key = f"{ministry_folder}_{proc_id}"
        cached_entry = self.cache.get(cache_key, {})

        doc_filename = f"{safe_code}.doc"
        docx_filename = f"{safe_code}.docx"
        doc_path = os.path.join(huong_dan_folder, doc_filename)
        docx_path = os.path.join(huong_dan_folder, docx_filename)

        final_filepath = None
        needs_download = True

        # Check if docx exists and is valid
        if os.path.exists(docx_path):
            current_size = os.path.getsize(docx_path)
            if current_size > 0 and (cached_entry.get('size') is None or current_size == cached_entry.get('size')):
                if cached_entry.get('checksum'):
                    current_checksum = self._calculate_file_checksum(docx_path)
                    if current_checksum and current_checksum == cached_entry.get('checksum'):
                        final_filepath = docx_path
                        needs_download = False
                        self.stats['cached'] += 1 # No lock needed as this is not parallel
                        print(f"   File already exists and validated: {proc_code}.docx (cached)")
                    else:
                        os.remove(docx_path)
                        print(f"   Checksum mismatch for {proc_code}.docx, re-downloading.")
                else:
                    final_filepath = docx_path
                    needs_download = False
                    self.stats['cached'] += 1 # No lock needed as this is not parallel
                    print(f"   File already exists: {proc_code}.docx (cached, no checksum validation)")
            else:
                if os.path.exists(docx_path): os.remove(docx_path)
                print(f"   File size mismatch for {proc_code}.docx, re-downloading.")

        # If docx doesn't exist or is invalid, check doc
        elif os.path.exists(doc_path):
            current_size = os.path.getsize(doc_path)
            if current_size > 0 and (cached_entry.get('size') is None or current_size == cached_entry.get('size')):
                if cached_entry.get('checksum'):
                    current_checksum = self._calculate_file_checksum(doc_path)
                    if current_checksum and current_checksum == cached_entry.get('checksum'):
                        final_filepath = doc_path
                        needs_download = False
                        self.stats['cached'] += 1 # No lock needed as this is not parallel
                        print(f"   File already exists and validated: {proc_code}.doc (cached)")
                    else:
                        os.remove(doc_path)
                        print(f"   Checksum mismatch for {proc_code}.doc, re-downloading.")
                else:
                    final_filepath = doc_path
                    needs_download = False
                    self.stats['cached'] += 1 # No lock needed as this is not parallel
                    print(f"   File already exists: {proc_code}.doc (cached, no checksum validation)")
            else:
                if os.path.exists(doc_path): os.remove(doc_path)
                print(f"   File size mismatch for {proc_code}.doc, re-downloading.")

        if not needs_download: # Only process if not downloading a fresh copy
            current_filepath = final_filepath
            if current_filepath.endswith('.doc'):
                print(f"   Converting cached .doc to .docx for {proc_code}...")
                current_filepath = self._convert_doc_to_docx(current_filepath)
                final_filepath = current_filepath # Update final_filepath after conversion

            if final_filepath and final_filepath.endswith('.docx'):
                print(f"   Adding link to cached .docx for {proc_code}...")
                final_processed_filepath = self._add_link_to_word_file(final_filepath, procedure['url'])

                if final_processed_filepath:
                    # Update checksum/size in cache after potential conversion/link addition
                    self.cache[cache_key]['checksum'] = self._calculate_file_checksum(final_processed_filepath)
                    self.cache[cache_key]['size'] = os.path.getsize(final_processed_filepath)
                else:
                    print(f"   Warning: Could not add link to cached file {proc_code}.docx.")
            else:
                print(f"   Warning: Cached file {proc_code} not .docx after conversion attempt, skipping link add.")
            return True # File was handled, either downloaded or processed from cache

        # Proceed with download if needs_download is True
        try:
            # Delay ngẫu nhiên để tránh spam
            time.sleep(0.5 + (hash(proc_id) % 10) * 0.1)

            # Mở trang chi tiết
            self.driver.get(procedure['url'])
            # Use WebDriverWait here instead of hardcoded time.sleep
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            self.wait.until(EC.visibility_of_element_located((By.XPATH, "//a[.//i[contains(@class, 'fa-file-word')]]")))


            # Tải file hướng dẫn chính (.doc)
            download_url = None
            try:
                word_link = self.driver.find_element(By.XPATH,
                    "//a[.//i[contains(@class, 'fa-file-word')]]"
                )
                download_url = word_link.get_attribute('href')
            except NoSuchElementException:
                print(f"   ⚠️ [{proc_code}] Không tìm thấy link hướng dẫn")

            if download_url:
                filename = f"{safe_code}.doc"
                filepath = os.path.join(huong_dan_folder, filename)

                if self._download_file(download_url, filepath):
                    # Convert and add link, then update cache with the final filepath
                    final_processed_filepath = self._add_link_to_word_file(filepath, procedure['url'])
                    if final_processed_filepath:
                        # Calculate checksum for the downloaded file
                        checksum = self._calculate_file_checksum(final_processed_filepath)
                        file_size = os.path.getsize(final_processed_filepath)
                        # Cập nhật cache
                        self.cache[cache_key] = {
                            'code': proc_code,
                            'title': proc_title,
                            'downloaded': True,
                            'checksum': checksum,
                            'size': file_size
                        }
                        self.stats['success'] += 1
                        print(f"   ✅ [{proc_code}] Đã tải file hướng dẫn và xử lý")
                        return True
                    else:
                        print(f"   ⚠️ [{proc_code}] Đã tải file nhưng không thể chuyển đổi/thêm link.")
                        self.stats['failed'] += 1 # Count as failed if post-processing fails
                        return False


            print(f"   ⚠️ [{proc_code}] Không tải được file hướng dẫn")
            self.stats['failed'] += 1
            return False

        except Exception as e:
            print(f"   ❌ [{proc_code}] Lỗi: {str(e)[:80]}")
            self.stats['failed'] += 1
            return False

            print(f"   ⚠️ [{proc_code}] Không tải được file hướng dẫn")
            self.stats['failed'] += 1
            return False

        except Exception as e:
            print(f"   ❌ [{proc_code}] Lỗi: {str(e)[:80]}")
            self.stats['failed'] += 1
            return False

    def _convert_doc_to_docx(self, doc_path):
        """
        Convert file .doc sang .docx
        Hỗ trợ 3 phương pháp:
        1. Windows: Dùng win32com (MS Word)
        2. Linux/Mac: Dùng LibreOffice
        3. Fallback: Đổi tên (không convert thật)
        """
        docx_path = doc_path.replace('.doc', '.docx')

        # Nếu đã là .docx, return luôn
        if doc_path.endswith('.docx'):
            return doc_path

        try:
            system = platform.system()

            # PHƯƠNG PHÁP 1: Windows - Dùng MS Word COM
            if system == 'Windows':
                try:
                    import win32com.client
                    import pythoncom

                    # Initialize COM for this thread if not already initialized
                    # This check helps avoid re-initialization errors
                    try:
                        pythoncom.CoInitialize()
                    except pythoncom.com_error as com_err:
                        # HRESULT = -2147417850 means already initialized
                        if com_err.args[0] != -2147417850:
                            raise

                    word = win32com.client.Dispatch('Word.Application')
                    word.Visible = False

                    # Mở file .doc
                    doc = word.Documents.Open(os.path.abspath(doc_path))

                    # Lưu thành .docx (format 16 = docx)
                    doc.SaveAs2(os.path.abspath(docx_path), FileFormat=16)
                    doc.Close()
                    word.Quit()

                    # Xóa file .doc cũ
                    if os.path.exists(docx_path):
                        os.remove(doc_path)
                        return docx_path

                except ImportError:
                    print("   ⚠️ Cài pywin32 để convert: pip install pywin32")
                except Exception as e:
                    print(f"   ❌ Lỗi khi convert .doc bằng win32com: {e}")
                finally:
                    # Uninitialize COM for this thread
                    try:
                        pythoncom.CoUninitialize()
                    except:
                        pass # Ignore errors during uninitialize

            # PHƯƠNG PHÁP 2: Linux/Mac - Dùng LibreOffice
            elif system in ['Linux', 'Darwin']:
                try:
                    # Tìm LibreOffice
                    libreoffice_cmd = None
                    for cmd in ['libreoffice', 'soffice', '/usr/bin/libreoffice',
                                '/Applications/LibreOffice.app/Contents/MacOS/soffice']:
                        # Check if command exists and is executable
                        if subprocess.run(['which', cmd], capture_output=True, shell=True).returncode == 0 or os.path.exists(cmd):
                            libreoffice_cmd = cmd
                            break

                    if libreoffice_cmd:
                        # Convert bằng LibreOffice
                        output_dir = os.path.dirname(doc_path)
                        subprocess.run([
                            libreoffice_cmd,
                            '--headless',
                            '--convert-to', 'docx',
                            '--outdir', output_dir,
                            doc_path
                        ], check=True, capture_output=True, timeout=60) # Increased timeout for LibreOffice

                        # Xóa file .doc cũ
                        if os.path.exists(docx_path):
                            os.remove(doc_path)
                            return docx_path
                    else:
                        print("   ⚠️ Không tìm thấy LibreOffice. Cài đặt: sudo apt-get install libreoffice (Linux) hoặc brew install libreoffice (Mac)")

                except subprocess.CalledProcessError as e:
                    print(f"   ❌ Lỗi khi chạy LibreOffice để convert: {e.stderr.decode()}")
                except subprocess.TimeoutExpired:
                    print(f"   ❌ LibreOffice timeout khi convert '{doc_path}'.")
                except Exception as e:
                    print(f"   ❌ Lỗi khi convert .doc bằng LibreOffice: {e}")

            # PHƯƠNG PHÁP 3: Fallback - Đổi tên (không convert thật)
            if os.path.exists(doc_path):
                print(f"   ⚠️ Fallback: Không thể convert .doc sang .docx thật, đổi tên '{doc_path}' thành '{docx_path}' (không convert nội dung).")
                os.rename(doc_path, docx_path)
                return docx_path

        except Exception as e:
            print(f"   ❌ Lỗi chung khi convert .doc sang .docx: {e}")

        # Nếu tất cả đều thất bại, return file gốc
        return doc_path

    def _calculate_file_checksum(self, filepath):
        """Calculate MD5 checksum of a file"""
        hash_md5 = hashlib.md5()
        try:
            with open(filepath, "rb") as f:
                # Read file in chunks to handle large files efficiently
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except FileNotFoundError:
            print(f"   ⚠️ File not found for checksum calculation: {filepath}")
            return None
        except IOError as e:
            print(f"   ❌ Error reading file for checksum calculation {filepath}: {e}")
            return None
        except Exception as e:
            print(f"   ❌ Unexpected error during checksum calculation {filepath}: {e}")
            return None

    def _add_link_to_word_file(self, filepath, url):
        """Thêm link thủ tục vào cuối file Word"""
        try:
            # Convert .doc sang .docx nếu cần
            if filepath.endswith('.doc'):
                filepath = self._convert_doc_to_docx(filepath)

            # Nếu vẫn là .doc (convert thất bại), bỏ qua
            if not filepath.endswith('.docx'):
                print(f"   ⚠️ Không thể thêm link vào file không phải .docx sau khi chuyển đổi: {filepath}")
                return False

            # Mở file Word
            doc = Document(filepath)

            # Thêm paragraph mới ở cuối
            doc.add_paragraph()  # Dòng trống

            # Thêm text với link
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT

            # Text trước link
            run1 = p.add_run("Để xem chi tiết thủ tục hành chính và tải các biểu mẫu cần thiết, vui lòng truy cập link sau: ")
            run1.font.size = Pt(12)
            run1.font.name = 'Times New Roman'

            # Link (màu xanh, underline)
            run2 = p.add_run(url)
            run2.font.size = Pt(12)
            run2.font.name = 'Times New Roman'
            run2.font.color.rgb = RGBColor(0, 0, 255)  # Màu xanh
            run2.font.underline = True

            # Lưu lại file
            doc.save(filepath)
            return filepath # Trả về đường dẫn file cuối cùng sau khi xử lý

        except FileNotFoundError:
            print(f"   ❌ Không tìm thấy file Word để thêm link: {filepath}")
            return None
        except Exception as e:
            print(f"   ❌ Lỗi khi thêm link vào file Word {filepath}: {e}")
            return None

    def _download_file(self, url, filepath, max_retries=5, retry_delay=3):
        """Download file từ URL với retry và validation"""
        # Ensure directory exists before downloading
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        for attempt in range(max_retries + 1):
            try:
                if not url.startswith('http'):
                    url = urljoin('https://thutuc.dichvucong.gov.vn', url)

                # Thử download với timeout và headers phù hợp hơn
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*',
                    'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
                    'Referer': 'https://thutuc.dichvucong.gov.vn/',
                    'Connection': 'keep-alive'
                }
                response = self.session.get(url, headers=headers, timeout=45, stream=True, allow_redirects=True)

                # Kiem tra status code
                if response.status_code not in [200, 206]:  # 206 là partial content
                    if response.status_code in [502, 503, 504, 505]:  # Server issues, wait longer
                        delay = retry_delay * (attempt + 1)  # Exponential backoff
                    else:
                        delay = retry_delay

                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Download that bai (status {response.status_code}), thu lai sau {delay}s...")
                        time.sleep(delay)
                        continue
                    return False

                # Kiem tra content-type (phai la file, khong phai HTML error page)
                content_type = response.headers.get('content-type', '').lower()
                if 'text/html' in content_type and 'application' not in content_type:
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Nhan HTML thay vi file, thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Download file with proper error handling
                try:
                    # Ensure the directory exists before writing
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                except OSError as e:
                    # Handle file system errors like WinError 2
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Loi file system: {str(e)}, thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Validate file
                if not os.path.exists(filepath):
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: File khong ton tai sau khi download, thu lai...")
                        time.sleep(retry_delay)
                        continue
                    return False

                file_size = os.path.getsize(filepath)

                # File qua nho (< 500 bytes) co the la error
                if file_size < 500:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: File qua nho ({file_size} bytes), thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Kiem tra xem co phai file that khong (doc vai bytes dau)
                try:
                    with open(filepath, 'rb') as f:
                        header = f.read(8)
                        if len(header) < 4:
                            if os.path.exists(filepath):
                                os.remove(filepath)
                            if attempt < max_retries:
                                print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Header khong hop le, thu lai sau {retry_delay}s...")
                                time.sleep(retry_delay)
                                continue
                            return False
                except OSError as e:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Loi doc header file: {str(e)}, thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Neu thanh cong, thoat khoi vong lap retry
                print(f"   OK - Tai thanh cong sau {attempt + 1} lan thu")
                return True

            except requests.exceptions.Timeout:
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass
                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Timeout khi tai file, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - Timeout sau {max_retries + 1} lan thu")
            except requests.exceptions.RequestException as e:
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass
                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Request loi: {str(e)[:50]}, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - Request that bai sau {max_retries + 1} lan thu: {str(e)[:100]}")
            except OSError as e:
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass
                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: OS loi (co the la WinError 2): {str(e)[:50]}, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - OS that bai sau {max_retries + 1} lan thu: {str(e)[:100]}")
            except Exception as e:
                # Xoa file loi neu co
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass

                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Ngoai le khi tai: {str(e)[:50]}, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - That bai sau {max_retries + 1} lan thu: {str(e)[:100]}")

        return False

    def download_procedure_parallel(self, procedure, ministry_folder):
        """Download một thủ tục trong chế độ song song"""
        proc_id = procedure['id']
        proc_code = procedure['code']
        proc_title = procedure['title']

        # Tạo folder cho Bộ/Ngành
        safe_code = re.sub(r'[^\w\-]', '_', proc_code)
        huong_dan_folder = os.path.join(ministry_folder, "huong_dan")
        os.makedirs(huong_dan_folder, exist_ok=True)

        # Check cache and file existence
        cache_key = f"{ministry_folder}_{proc_id}"
        cached_entry = self.cache.get(cache_key, {})

        doc_filename = f"{safe_code}.doc"
        docx_filename = f"{safe_code}.docx"
        doc_path = os.path.join(huong_dan_folder, doc_filename)
        docx_path = os.path.join(huong_dan_folder, docx_filename)

        final_filepath = None
        needs_download = True

        # Check if docx exists and is valid
        if os.path.exists(docx_path):
            current_size = os.path.getsize(docx_path)
            if current_size > 0 and (cached_entry.get('size') is None or current_size == cached_entry.get('size')):
                if cached_entry.get('checksum'):
                    current_checksum = self._calculate_file_checksum(docx_path)
                    if current_checksum and current_checksum == cached_entry.get('checksum'):
                        final_filepath = docx_path
                        needs_download = False
                        with self.stats_lock:
                            self.stats['cached'] += 1
                        print(f"   File already exists and validated: {proc_code}.docx (cached)")
                    else:
                        os.remove(docx_path)
                        print(f"   Checksum mismatch for {proc_code}.docx, re-downloading.")
                else:
                    final_filepath = docx_path
                    needs_download = False
                    with self.stats_lock:
                        self.stats['cached'] += 1
                    print(f"   File already exists: {proc_code}.docx (cached, no checksum validation)")
            else:
                if os.path.exists(docx_path): os.remove(docx_path)
                print(f"   File size mismatch for {proc_code}.docx, re-downloading.")

        # If docx doesn't exist or is invalid, check doc
        elif os.path.exists(doc_path):
            current_size = os.path.getsize(doc_path)
            if current_size > 0 and (cached_entry.get('size') is None or current_size == cached_entry.get('size')):
                if cached_entry.get('checksum'):
                    current_checksum = self._calculate_file_checksum(doc_path)
                    if current_checksum and current_checksum == cached_entry.get('checksum'):
                        final_filepath = doc_path
                        needs_download = False
                        with self.stats_lock:
                            self.stats['cached'] += 1
                        print(f"   File already exists and validated: {proc_code}.doc (cached)")
                    else:
                        os.remove(doc_path)
                        print(f"   Checksum mismatch for {proc_code}.doc, re-downloading.")
                else:
                    final_filepath = doc_path
                    needs_download = False
                    with self.stats_lock:
                        self.stats['cached'] += 1
                    print(f"   File already exists: {proc_code}.doc (cached, no checksum validation)")
            else:
                if os.path.exists(doc_path): os.remove(doc_path)
                print(f"   File size mismatch for {proc_code}.doc, re-downloading.")

        if needs_download:
            # Tạo driver riêng cho luồng này
            driver = self._create_driver()
            wait = WebDriverWait(driver, 10)
            try:
                # Mở trang chi tiết
                driver.get(procedure['url'])

                # Tải file hướng dẫn chính (.doc)
                download_url = None
                for retry in range(3):
                    try:
                        # Đợi page load hoàn toàn
                        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))

                        word_link = driver.find_element(By.XPATH,
                            "//a[.//i[contains(@class, 'fa-file-word')]]"
                        )
                        download_url = word_link.get_attribute('href')
                        break
                    except Exception as e:
                        if retry < 2:
                            time.sleep(0.5)
                        else:
                            print(f"   ⚠️ [{proc_code}] Không tìm thấy link hướng dẫn")

                if download_url:
                    filename = f"{safe_code}.doc"
                    filepath = os.path.join(huong_dan_folder, filename)

                    # Sử dụng session riêng để download
                    session = requests.Session()
                    session.headers.update({
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    })

                    # Download file
                    if self._download_file_with_session(download_url, filepath, session):
                        # Thêm link vào cuối file Word và lấy đường dẫn cuối cùng sau khi chuyển đổi
                        final_processed_filepath = self._add_link_to_word_file(filepath, procedure['url'])

                        if final_processed_filepath:
                            # Calculate checksum for the downloaded file
                            checksum = self._calculate_file_checksum(final_processed_filepath)
                            file_size = os.path.getsize(final_processed_filepath)
                            # Cập nhật cache
                            with self.cache_lock:
                                self.cache[cache_key] = {
                                    'code': proc_code,
                                    'title': proc_title,
                                    'downloaded': True,
                                    'checksum': checksum,
                                    'size': file_size
                                }
                            with self.stats_lock:
                                self.stats['success'] += 1
                            driver.quit()
                            return True, proc_code, "success"
                        else:
                            print(f"   ⚠️ [{proc_code}] Đã tải file nhưng không thể chuyển đổi/thêm link.")
                            with self.stats_lock:
                                self.stats['failed'] += 1 # Count as failed if post-processing fails
                            driver.quit()
                            return False, proc_code, "failed_post_process"

                with self.stats_lock:
                    self.stats['failed'] += 1
                driver.quit()
                return False, proc_code, "failed_download"

            except Exception as e:
                with self.stats_lock:
                    self.stats['failed'] += 1
                driver.quit()
                return False, proc_code, f"error: {str(e)[:50]}"
        else:
            # If not downloading (i.e., cached), ensure it's converted to docx and has link
            current_filepath = final_filepath
            if current_filepath.endswith('.doc'):
                print(f"   Converting cached .doc to .docx for {proc_code}...")
                current_filepath = self._convert_doc_to_docx(current_filepath)
                final_filepath = current_filepath # Update final_filepath after conversion

            if final_filepath and final_filepath.endswith('.docx'):
                print(f"   Adding link to cached .docx for {proc_code}...")
                final_processed_filepath = self._add_link_to_word_file(final_filepath, procedure['url'])

                if final_processed_filepath:
                    # Update checksum/size in cache after potential conversion/link addition
                    with self.cache_lock:
                        self.cache[cache_key]['checksum'] = self._calculate_file_checksum(final_processed_filepath)
                        self.cache[cache_key]['size'] = os.path.getsize(final_processed_filepath)
                else:
                    print(f"   Warning: Could not add link to cached file {proc_code}.docx.")
            else:
                print(f"   Warning: Cached file {proc_code} not .docx after conversion attempt, skipping link add.")
            return True, proc_code, "cached" # Still counted as cached

    def _download_file_with_session(self, url, filepath, session, max_retries=5, retry_delay=3):
        """Download file từ URL với session cụ thể, có retry khi lỗi"""
        # Ensure directory exists before downloading
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        for attempt in range(max_retries + 1):
            try:
                if not url.startswith('http'):
                    url = urljoin('https://thutuc.dichvucong.gov.vn', url)

                # Thử download với timeout và headers phù hợp hơn
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*',
                    'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
                    'Referer': 'https://thutuc.dichvucong.gov.vn/',
                    'Connection': 'keep-alive'
                }
                response = session.get(url, headers=headers, timeout=45, stream=True, allow_redirects=True)

                # Kiem tra status code
                if response.status_code not in [200, 206]:  # 206 là partial content
                    if response.status_code in [502, 503, 504, 505]:  # Server issues, wait longer
                        delay = retry_delay * (attempt + 1)  # Exponential backoff
                    else:
                        delay = retry_delay

                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Download that bai (status {response.status_code}), thu lai sau {delay}s...")
                        time.sleep(delay)
                        continue
                    return False

                # Kiem tra content-type (phai la file, khong phai HTML error page)
                content_type = response.headers.get('content-type', '').lower()
                if 'text/html' in content_type and 'application' not in content_type:
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Nhan HTML thay vi file, thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Download file with proper error handling
                try:
                    # Ensure the directory exists before writing
                    os.makedirs(os.path.dirname(filepath), exist_ok=True)
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                except OSError as e:
                    # Handle file system errors like WinError 2
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Loi file system: {str(e)}, thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Validate file
                if not os.path.exists(filepath):
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: File khong ton tai sau khi download, thu lai...")
                        time.sleep(retry_delay)
                        continue
                    return False

                file_size = os.path.getsize(filepath)

                # File qua nho (< 500 bytes) co the la error
                if file_size < 500:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: File qua nho ({file_size} bytes), thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Kiem tra xem co phai file that khong (doc vai bytes dau)
                try:
                    with open(filepath, 'rb') as f:
                        header = f.read(8)
                        if len(header) < 4:
                            if os.path.exists(filepath):
                                os.remove(filepath)
                            if attempt < max_retries:
                                print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Header khong hop le, thu lai sau {retry_delay}s...")
                                time.sleep(retry_delay)
                                continue
                            return False
                except OSError as e:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    if attempt < max_retries:
                        print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Loi doc header file: {str(e)}, thu lai sau {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                    return False

                # Neu thanh cong, thoat khoi vong lap retry
                print(f"   OK - Tai thanh cong sau {attempt + 1} lan thu")
                return True

            except requests.exceptions.Timeout:
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass
                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Timeout khi tai file, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - Timeout sau {max_retries + 1} lan thu")
            except requests.exceptions.RequestException as e:
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass
                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Request loi: {str(e)[:50]}, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - Request that bai sau {max_retries + 1} lan thu: {str(e)[:100]}")
            except OSError as e:
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass
                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: OS loi (co the la WinError 2): {str(e)[:50]}, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - OS that bai sau {max_retries + 1} lan thu: {str(e)[:100]}")
            except Exception as e:
                # Xoa file loi neu co
                if os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except:
                        pass

                if attempt < max_retries:
                    print(f"   Warning - Lan {attempt + 1}/{max_retries + 1}: Ngoai le khi tai: {str(e)[:50]}, thu lai sau {retry_delay}s...")
                    time.sleep(retry_delay)
                else:
                    print(f"   Failed - That bai sau {max_retries + 1} lan thu: {str(e)[:100]}")

        return False

    def download_all_guides(self, procedures, ministry_folder):
        """Download tất cả file hướng dẫn với đa luồng"""
        print("="*70)
        print("⚡ BẮT ĐẦU DOWNLOAD FILE HƯỚNG DẪN (ĐA LUỒNG)")
        print("="*70)

        # First pass: download all procedures
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_procedure = {
                executor.submit(self.download_procedure_parallel, procedure, ministry_folder): procedure
                for procedure in procedures
            }

            # Track progress
            completed = 0
            total = len(procedures)

            for future in as_completed(future_to_procedure):
                completed += 1
                success, proc_code, status = future.result()

                if status == "cached":
                    print(f"\n📝 [{completed}/{total}] [{proc_code}] ĐÃ CÓ TRONG CACHE")
                elif success:
                    print(f"\n✅ [{completed}/{total}] [{proc_code}] Tải thành công")
                else:
                    print(f"\n❌ [{completed}/{total}] [{proc_code}] Tải thất bại ({status})")

                # In thống kê sau mỗi 5 thủ tục hoặc cuối cùng
                if completed % 5 == 0 or completed == total:
                    print(f"📊 Tiến độ: {completed}/{total} | "
                          f"✅ {self.stats['success']} | "
                          f"💾 {self.stats['cached']} | "
                          f"❌ {self.stats['failed']}")

        # Summary of first run
        print(f"\n📊 KẾT QUẢ SAU LẦN CHẠY ĐẦU:")
        print(f"   ✅ Thành công: {self.stats['success']}")
        print(f"   💾 Đã có (cache): {self.stats['cached']}")
        print(f"   ❌ Thất bại: {self.stats['failed']}")

        # Note that the actual retry mechanism is already implemented in the download methods
        # Each download attempt includes built-in retry logic
        if self.stats['failed'] > 0:
            print(f"ℹ️  Các lần tải thất bại đã được tự động thử lại theo cơ chế retry nội tại")

        print(f"\n🎉 HOÀN TẤT TIẾN TRÌNH TẢI XUỐNG!")

        self._save_cache()

    def run(self, url, ministry_name, max_procedures=None):
        """Chạy scraper cho một Bộ/Ngành"""
        start_time = time.time()

        try:
            # Tạo folder cho Bộ/Ngành
            safe_ministry = re.sub(r'[^\w\-]', '_', ministry_name)
            ministry_folder = os.path.join(self.download_dir, safe_ministry)
            os.makedirs(ministry_folder, exist_ok=True)

            # Lấy danh sách thủ tục
            procedures = self.get_all_procedures(url, ministry_name)

            if not procedures:
                print("❌ Không tìm thấy thủ tục nào!")
                return

            # Giới hạn nếu cần
            if max_procedures:
                procedures = procedures[:max_procedures]
                print(f"⚠️ Giới hạn: {max_procedures} thủ tục đầu tiên\n")

            # Lưu danh sách với tên thủ tục đầy đủ
            list_file = os.path.join(ministry_folder, f'danh_sach_{safe_ministry}.txt')
            with open(list_file, 'w', encoding='utf-8') as f:
                f.write(f"DANH SÁCH THỦ TỤC HÀNH CHÍNH - {ministry_name.upper()}\n")
                f.write("="*80 + "\n")
                f.write(f"Tổng số: {len(procedures)} thủ tục\n")
                f.write(f"Ngày tạo: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write("="*80 + "\n\n")
                for i, p in enumerate(procedures, 1):
                    f.write(f"{i}. [{p['code']}] {p['title']}\n")
                    f.write(f"   URL: {p['url']}\n\n")

            print(f"✅ Đã lưu danh sách: {list_file}")
            print(f"📁 Cấu trúc thư mục:")
            print(f"   {ministry_folder}/")
            print(f"   ├── huong_dan/     (File hướng dẫn .doc/.docx)")
            print(f"   └── danh_sach_{safe_ministry}.txt\n")

            # Download files
            self.download_all_guides(procedures, ministry_folder)

            # Kết quả
            elapsed = time.time() - start_time

            print("\n" + "="*70)
            print("📊 KẾT QUẢ CUỐI CÙNG")
            print("="*70)
            print(f"✅ Thủ tục thành công: {self.stats['success']}")
            print(f"💾 Đã có (cache): {self.stats['cached']}")
            print(f"❌ Thất bại: {self.stats['failed']}")
            print(f"📁 Thư mục: {ministry_folder}/")
            print(f"⏱️ Thời gian: {elapsed/60:.1f} phút")

        except Exception as e:
            print(f"\n❌ Lỗi nghiêm trọng: {e}")
            import traceback
            traceback.print_exc()

        finally:
            try:
                self.driver.quit()
            except:
                pass
            print("\n🎉 HOÀN TẤT!")


def get_user_input(prompt, default_value=None, valid_options=None):
    """
    Get user input with fallback for environments where input() might not work
    """
    import sys
    import os

    # Check if stdin is a terminal (TTY)
    if not os.isatty(sys.stdin.fileno()):
        print(f"\n⚠️ Không thể nhận input từ người dùng (không phải môi trường terminal). Sử dụng giá trị mặc định: {default_value}")
        return default_value

    try:
        choice = input(prompt).strip()
        if not choice and default_value is not None:
            return default_value
        if valid_options and choice not in valid_options:
            print(f"Lựa chọn '{choice}' không hợp lệ. Sử dụng giá trị mặc định: {default_value}")
            return default_value
        return choice
    except (EOFError, KeyboardInterrupt):
        # Handle case where no input is available (like when running in certain IDEs)
        print(f"\n⚠️ Không thể nhận input từ người dùng. Sử dụng giá trị mặc định: {default_value}")
        return default_value
    except Exception:
        # Fallback for other environments where input() doesn't work
        print(f"\n⚠️ Không thể nhận input từ người dùng. Sử dụng giá trị mặc định: {default_value}")
        return default_value


def main():
    """Hàm main"""
    print("""
╔═══════════════════════════════════════════════════════════════╗
║   SCRAPER THỦ TỤC HÀNH CHÍNH - TẤT CẢ BỘ/NGÀNH               ║
║  ✅ Chọn được bất kỳ Bộ/Ngành nào                            ║
║  ✅ Tải file hướng dẫn (.doc)                                ║
║  ✅ Tự động convert .doc → .docx                             ║
║  ✅ Thêm link thủ tục vào cuối file Word                     ║
║  ✅ Ghi rõ tên thủ tục đầy đủ                                ║
╚═══════════════════════════════════════════════════════════════╝

📦 CÀI ĐẶT:
   pip install selenium requests python-docx

   Windows: pip install pywin32
   Linux:   sudo apt-get install libreoffice
   Mac:     brew install libreoffice
""")

    print("📋 DANH SÁCH BỘ/NGÀNH:")
    print("="*70)
    for key, name in sorted(MINISTRIES.items(), key=lambda x: int(x[0])):
        print(f"{key:>2}. {name}")

    print("\n⚙️ CHỌN BỘ/NGÀNH:")
    choice = get_user_input("Nhập số (1-20): ", "1", MINISTRIES.keys())
    ministry_name = MINISTRIES.get(choice)

    if not ministry_name:
        print("❌ Lựa chọn không hợp lệ!")
        print("✅ Sử dụng giá trị mặc định: Bộ Công an (1)")
        ministry_name = MINISTRIES.get("1")
        choice = "1"

    print(f"\n✅ Đã chọn: {ministry_name}")

    print("\n⚙️ CHỌN CHẾ ĐỘ:")
    print("1. TEST - 5 thủ tục (nhanh, để test)")
    print("2. MEDIUM - 20 thủ tục (kiểm tra)")
    print("3. FULL - TẤT CẢ thủ tục (chạy thật)")

    mode = get_user_input("\nChọn (1-3) [Mặc định: 1]: ", "1", ["1", "2", "3"])
    if not mode:
        mode = "1"

    limits = {"1": 5, "2": 20, "3": None}
    max_procs = limits.get(mode, 5)

    headless = (mode == "3")

    print(f"\n🚀 BẮT ĐẦU...\n")

    url = "https://thutuc.dichvucong.gov.vn/p/home/dvc-tthc-thu-tuc-hanh-chinh.html"

    try:
        scraper = ProcedureScraper(
            download_dir='downloads_ministries',
            max_workers=8,
            headless=headless
        )
        scraper.run(url, ministry_name, max_procs)
    except KeyboardInterrupt:
        print("\n\n⚠️ Đã dừng bởi người dùng")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    import sys
    import io
    # Set stdout to handle Unicode characters properly
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    main()
