import sys
import json
import traceback

def log_debug(msg):
    """Logs debug info to stderr so it doesn't corrupt stdout (the JSON-RPC transport)."""
    sys.stderr.write(f"[DEBUG] {msg}\n")
    sys.stderr.flush()

def handle_request(request):
    """Processes incoming JSON-RPC requests conforming to the MCP Specification."""
    method = request.get("method")
    req_id = request.get("id")
    
    if not method:
        return None
        
    log_debug(f"Received request method: {method}")
    
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "serverInfo": {
                    "name": "pushti-diet-mcp-server",
                    "version": "1.0.0"
                }
            }
        }
        
    elif method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "tools": [
                    {
                        "name": "recommend_diet_rules",
                        "description": "Retrieve clinical guidelines and nutrition targets for specific chronic diseases in Bangladesh.",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "disease": {
                                    "type": "string",
                                    "description": "Disease condition (e.g. Diabetes, Hypertension, Chronic Kidney Disease)"
                                }
                            },
                            "required": ["disease"]
                        }
                    }
                ]
            }
        }
        
    elif method == "tools/call":
        params = request.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        disease = arguments.get("disease", "").lower()
        
        log_debug(f"Calling tool: {tool_name} with arguments: {arguments}")
        
        if tool_name == "recommend_diet_rules":
            # Clinical nutrition logic
            if "diab" in disease:
                recommendation = "Target: High fiber (25-30g/day). Prioritize Lal Chal (Brown Rice), Mug Dal. Restrict high GI carbs."
            elif "hyper" in disease or "pressure" in disease:
                recommendation = "Target: Low Sodium (<1500mg/day). Avoid added table salt, processed foods, dry fish (Shutki)."
            elif "kidney" in disease or "ckd" in disease:
                recommendation = "Target: Restrict Potassium and Phosphorus. Limit spinach, bananas, milk products. Protein: 0.6g/kg/day."
            else:
                recommendation = "Default Desi Diet: Balance protein, healthy fats, and high-fiber local vegetables."
                
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": recommendation
                        }
                    ]
                }
            }
        else:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {tool_name}"
                }
            }
            
    # Default JSON-RPC response for notifications or unimplemented protocols
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {}
    }

def main():
    log_debug("Pushti Diet MCP Server started.")
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            request = json.loads(line)
            response = handle_request(request)
            if response:
                sys.stdout.write(json.dumps(response) + "\n")
                sys.stdout.flush()
        except Exception as e:
            log_debug(f"Exception: {e}")
            traceback.print_exc(file=sys.stderr)

if __name__ == "__main__":
    main()
