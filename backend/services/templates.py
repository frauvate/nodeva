import uuid
from typing import Tuple, List

def get_template_data(template_name: str) -> Tuple[List[dict], List[dict]]:
    if template_name == "basic":
        return [], []
    elif template_name == "flowchart":
        # Create IDs for nodes
        id_start = str(uuid.uuid4())
        id_process1 = str(uuid.uuid4())
        id_decision = str(uuid.uuid4())
        id_process2_yes = str(uuid.uuid4())
        id_process2_no = str(uuid.uuid4())
        id_end = str(uuid.uuid4())

        nodes = [
            {
                "id": id_start,
                "type": "flow_start",
                "position": {"x": 100, "y": 250},
                "data": {"title": "Başlangıç", "content": "", "color": "var(--node-blue)"}
            },
            {
                "id": id_process1,
                "type": "flow_process",
                "position": {"x": 350, "y": 250},
                "data": {"title": "Süreci Başlat", "content": "Verileri al", "color": "var(--node-pink)"}
            },
            {
                "id": id_decision,
                "type": "flow_decision",
                "position": {"x": 600, "y": 250},
                "data": {"title": "Karar?", "content": "Koşul sağlandı mı?", "color": "var(--node-purple)"}
            },
            {
                "id": id_process2_yes,
                "type": "flow_process",
                "position": {"x": 850, "y": 150},
                "data": {"title": "Evet İşlemi", "content": "Koşul doğru.", "color": "var(--node-green)"}
            },
            {
                "id": id_process2_no,
                "type": "flow_process",
                "position": {"x": 850, "y": 350},
                "data": {"title": "Hayır İşlemi", "content": "Koşul yanlış.", "color": "var(--node-yellow)"}
            },
            {
                "id": id_end,
                "type": "flow_end",
                "position": {"x": 1100, "y": 150},
                "data": {"title": "Bitiş", "content": "", "color": "var(--node-blue)"}
            }
        ]

        edges = [
            {
                "id": str(uuid.uuid4()),
                "source": id_start,
                "sourceHandle": "right",
                "target": id_process1,
                "targetHandle": "left"
            },
            {
                "id": str(uuid.uuid4()),
                "source": id_process1,
                "sourceHandle": "right",
                "target": id_decision,
                "targetHandle": "left"
            },
            {
                "id": str(uuid.uuid4()),
                "source": id_decision,
                "sourceHandle": "top",
                "target": id_process2_yes,
                "targetHandle": "left"
            },
            {
                "id": str(uuid.uuid4()),
                "source": id_decision,
                "sourceHandle": "bottom",
                "target": id_process2_no,
                "targetHandle": "left"
            },
            {
                "id": str(uuid.uuid4()),
                "source": id_process2_yes,
                "sourceHandle": "right",
                "target": id_end,
                "targetHandle": "left"
            }
        ]
        return nodes, edges
    
    return [], []
