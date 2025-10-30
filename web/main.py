import os, sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'model'))
from app.blip_models.blip_itm import blip_itm
from pathlib import Path
import torch
import shutil
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles
import json
from googletrans import Translator

os.environ["KMP_DUPLICATE_LIB_OK"]="TRUE"

app = FastAPI()

# Gắn thư mục static để phục vụ file tĩnh
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), 'static')), name="static")
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), 'templates'))

class Translation:
    def __init__(self):
        # Tạo đối tượng Translator
        self.translator = Translator()

    def __call__(self, text):
        # Dịch văn bản sang tiếng Anh
        translated = self.translator.translate(text, src='auto', dest='en')
        return translated.text

class SearchRequest(BaseModel):
    input: str

class SearchResult(BaseModel):
    image_files: list
    key_frames: list
    images_id: list

FILE = Path(__file__).resolve()
# Read folder containing file path
ROOT = FILE.parents[0]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))  # add ROOT to PATH
ROOT = Path(os.path.abspath(ROOT))  # relative
# main work directory
WORK_DIR = os.path.dirname(ROOT)
    
mode_compute = 'blip'

# for keyframes dictionary
data_path = os.path.join(WORK_DIR, 'data')
keyframes_id_path = "E:/AIC/embeddings/json_id/keyframes_id_all_1.json"

# for features file
folder_features = os.path.join(data_path, 'bins')
bin_path = "E:/AIC/embeddings/faiss_index/faiss_cosine_1.bin"

# for results
result_path = os.path.join(WORK_DIR, 'results')
mode_result_path = os.path.join(result_path, mode_compute)

if os.getcwd() != WORK_DIR:
    print("Changing to proper working directory...")
    os.chdir(WORK_DIR)
    print(f"Done, working directory: {os.getcwd()}")

if not os.path.exists(os.path.join(result_path)):
    os.makedirs(result_path)

if not os.path.exists(os.path.join(mode_result_path)):
    os.makedirs(mode_result_path)

device = torch.device('cuda:1' if torch.cuda.is_available() else 'cpu')
image_size = 384

translator = Translation()

model_path = "E:/AIC/models/model_base_retrieval_coco.pth"

## Model = BLIP search
model = blip_itm(pretrained=model_path, image_size=image_size, vit='base', keyframes_dict=keyframes_id_path, features_path=bin_path)
model.eval()
model = model.to(device)
model.load_index_from_bin_file()
print(f"init model & index done, n.o. features: {model.index.ntotal}")

def total_data(json_file_path):
    with open(json_file_path, 'r') as file:
        data = json.load(file)
    ids, paths = zip(*[(key, value) for key, value in data.items()])
    return ids, paths

json_file_path = "E:/AIC/embeddings/json_id/keyframes_id_all_1.json"
total_images_id, total_images_path = total_data(json_file_path)

def delete_images_in_folder(folder_path):
    # Lặp qua tất cả các tệp trong thư mục
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        try:
            if filename.endswith('.jpg'):
                # Xóa tệp ảnh
                os.remove(file_path)
        except Exception as e:
            print(f"Không thể xóa tệp {filename}: {str(e)}")

def copy_images_to_destination(image_paths, destination_folder):
    delete_images_in_folder(destination_folder)
    for image_path in image_paths:
        # Lấy tên tệp ảnh từ đường dẫn
        image_filename = os.path.basename(image_path)
        # Đường dẫn đến tệp ảnh trong thư mục đích
        destination_path = os.path.join(destination_folder, image_filename)
        # Sao chép tệp ảnh từ đường dẫn nguồn vào thư mục đích
        shutil.copy(image_path, destination_path)
        # image_file = Image.open(image_path) 
        # image_file.save(destination_path, quality=10)

    print("Đã sao chép các ảnh thành công vào thư mục đích:", destination_folder)

def format_for_CSV(image_paths, ids):
    shortened_path = []  # Danh sách kết quả

    for i, path in enumerate(image_paths):
        parts = path.split("/")  # Tách đường dẫn thành các phần
        folder_name = parts[-2]  # Tên thư mục chứa loại và phiên bản
        file_name = parts[-1].split(".")[0]  # Tên tập tin mà không có phần mở rộng
        shortened = f"{folder_name},{file_name}"
        shortened_path.append(shortened)

    return shortened_path, ids

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("app.html", {"request": request})

@app.post("/search", response_model=SearchResult)
async def search(search_request: SearchRequest):
    while True:
        translated_text = translator(search_request.input)
        print(f"Query text (translated & filtered): {translated_text}")

        scores, images_id, image_paths = model.text_search(translated_text, k=100)
        shortened_path, images_id = format_for_CSV(image_paths,images_id.tolist())

        destination_folder = "E:/AIC/web/static/images"
        copy_images_to_destination(image_paths, destination_folder)

        image_files = [os.path.join('images', filename) for filename in os.listdir(destination_folder) if filename.endswith('.jpg')]

        response_data = {
                'image_files': image_files,
                'images_id': images_id,
                'key_frames': shortened_path,
        }

        return response_data

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8210, debug=True)

# uvicorn main:app --reload
# uvicorn web.main:app --host 127.0.0.1 --port 8210 --reload
# http://127.0.0.1:8210/
