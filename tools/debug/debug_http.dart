import 'package:http/http.dart' as http;

void main() async {
  const String baseUrl = 'https://www.cm1.eprs.jp/kariya/web/view/user/';
  
  try {
    print('Testing HTTP connection to reservation site...');
    
    // Test basic connection
    final response = await http.get(
      Uri.parse('${baseUrl}homeIndex.html'),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    );
    
    print('Status Code: ${response.statusCode}');
    print('Response Headers: ${response.headers}');
    print('Response Body Length: ${response.body.length}');
    
    if (response.statusCode == 200) {
      print('First 500 characters of response:');
      print(response.body.substring(0, response.body.length > 500 ? 500 : response.body.length));
    }
    
  } catch (e) {
    print('HTTP Error: $e');
  }
}