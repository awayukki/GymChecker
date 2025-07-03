import 'package:http/http.dart' as http;
import 'package:html/parser.dart' as html_parser;

void main() async {
  const String baseUrl = 'https://www.cm1.eprs.jp/kariya/web/view/user/';
  
  try {
    print('Analyzing site structure with session...');
    
    // Get homepage with session
    final client = http.Client();
    final homeResponse = await client.get(
      Uri.parse('${baseUrl}homeIndex.html'),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    );
    
    if (homeResponse.statusCode != 200) {
      print('Failed to get homepage');
      return;
    }
    
    // Extract session ID
    String? sessionId;
    final setCookie = homeResponse.headers['set-cookie'];
    if (setCookie != null) {
      final match = RegExp(r'JSESSIONID=([^;]+)').firstMatch(setCookie);
      if (match != null) {
        sessionId = match.group(1);
      }
    }
    
    print('Session ID: $sessionId');
    
    final document = html_parser.parse(homeResponse.body);
    
    // Look for all clickable elements that might lead to facility info
    final allLinks = document.querySelectorAll('a, button, input[type="submit"], input[type="button"]');
    
    print('\nAll interactive elements:');
    for (final element in allLinks) {
      final href = element.attributes['href'];
      final onClick = element.attributes['onclick'];
      final name = element.attributes['name'];
      final value = element.attributes['value'];
      final text = element.text.trim();
      
      if (text.isNotEmpty || href != null || onClick != null) {
        print('  Element: ${element.localName}');
        print('    Text: "$text"');
        if (href != null) print('    Href: $href');
        if (onClick != null) print('    OnClick: $onClick');
        if (name != null) print('    Name: $name');
        if (value != null) print('    Value: $value');
        print('');
      }
    }
    
    // Look for forms that might be used for navigation
    final forms = document.querySelectorAll('form');
    print('\nForms found:');
    for (int i = 0; i < forms.length; i++) {
      final form = forms[i];
      final action = form.attributes['action'];
      final method = form.attributes['method'];
      print('  Form $i: action="$action", method="$method"');
      
      final inputs = form.querySelectorAll('input, select, textarea, button');
      for (final input in inputs) {
        final type = input.attributes['type'];
        final name = input.attributes['name'];
        final value = input.attributes['value'];
        final text = input.text.trim();
        print('    Input: type="$type", name="$name", value="$value", text="$text"');
      }
      print('');
    }
    
    client.close();
    
  } catch (e) {
    print('Error: $e');
  }
}