import 'package:http/http.dart' as http;
import 'package:html/parser.dart' as html_parser;

void main() async {
  const String baseUrl = 'https://www.cm1.eprs.jp/kariya/web/view/user/';
  
  try {
    print('Extracting facility names from site...');
    
    // Get homepage with session
    final client = http.Client();
    final homeResponse = await client.get(
      Uri.parse('${baseUrl}homeIndex.html'),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    );
    
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
    
    // Try facility name search page
    final nameSearchUrl = '${baseUrl}rsvNameSearch.html${sessionId != null ? ";jsessionid=$sessionId" : ""}';
    print('\nAccessing name search page: $nameSearchUrl');
    
    final nameSearchResponse = await client.get(
      Uri.parse(nameSearchUrl),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        if (sessionId != null) 'Cookie': 'JSESSIONID=$sessionId',
      },
    );
    
    if (nameSearchResponse.statusCode == 200) {
      print('Successfully accessed name search page');
      
      final document = html_parser.parse(nameSearchResponse.body);
      
      // Look for facility options in select elements
      final selects = document.querySelectorAll('select');
      print('\nFound ${selects.length} select elements:');
      
      for (int i = 0; i < selects.length; i++) {
        final select = selects[i];
        final name = select.attributes['name'];
        print('  Select $i: name="$name"');
        
        final options = select.querySelectorAll('option');
        print('    Options (${options.length}):');
        
        for (final option in options) {
          final value = option.attributes['value'];
          final text = option.text.trim();
          if (text.isNotEmpty && text != '選択してください') {
            print('      "$text" (value: $value)');
          }
        }
        print('');
      }
      
      // Look for facility checkboxes or radio buttons
      final inputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"]');
      print('Facility input options (${inputs.length}):');
      
      for (final input in inputs) {
        final name = input.attributes['name'];
        final value = input.attributes['value'];
        final id = input.attributes['id'];
        
        // Look for associated label
        String? labelText;
        if (id != null) {
          final label = document.querySelector('label[for="$id"]');
          labelText = label?.text.trim();
        }
        
        // Also check parent or next sibling for text
        labelText ??= input.parent?.text.trim();
        labelText ??= input.nextElementSibling?.text.trim();
        
        if (labelText != null && labelText.isNotEmpty && labelText.length < 100) {
          print('  "$labelText" (name: $name, value: $value)');
        }
      }
    }
    
    client.close();
    
  } catch (e) {
    print('Error: $e');
  }
}