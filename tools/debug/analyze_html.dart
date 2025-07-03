import 'package:http/http.dart' as http;
import 'package:html/parser.dart' as html_parser;

void main() async {
  const String baseUrl = 'https://www.cm1.eprs.jp/kariya/web/view/user/';
  
  try {
    print('Analyzing HTML structure...');
    
    // Get homepage
    final response = await http.get(
      Uri.parse('${baseUrl}homeIndex.html'),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    );
    
    if (response.statusCode == 200) {
      final document = html_parser.parse(response.body);
      
      // Find all links
      final links = document.querySelectorAll('a');
      print('\nFound ${links.length} links:');
      
      for (final link in links) {
        final text = link.text.trim();
        final href = link.attributes['href'];
        if (text.isNotEmpty && href != null) {
          print('  "$text" -> $href');
        }
      }
      
      // Find forms
      final forms = document.querySelectorAll('form');
      print('\nFound ${forms.length} forms:');
      
      for (int i = 0; i < forms.length; i++) {
        final form = forms[i];
        final action = form.attributes['action'];
        final method = form.attributes['method'];
        print('  Form $i: action="$action", method="$method"');
        
        final inputs = form.querySelectorAll('input, select, textarea');
        for (final input in inputs) {
          final type = input.attributes['type'];
          final name = input.attributes['name'];
          final value = input.attributes['value'];
          print('    Input: type="$type", name="$name", value="$value"');
        }
      }
    }
    
  } catch (e) {
    print('Error: $e');
  }
}