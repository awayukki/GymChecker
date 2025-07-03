import 'package:http/http.dart' as http;
import 'package:html/parser.dart' as html_parser;

void main() async {
  const String baseUrl = 'https://www.cm1.eprs.jp/kariya/web/view/user/';
  
  try {
    print('Getting facility list...');
    
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
    
    // Get name search page
    final nameSearchUrl = '${baseUrl}rsvNameSearch.html${sessionId != null ? ";jsessionid=$sessionId" : ""}';
    final nameSearchResponse = await client.get(
      Uri.parse(nameSearchUrl),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        if (sessionId != null) 'Cookie': 'JSESSIONID=$sessionId',
      },
    );
    
    if (nameSearchResponse.statusCode == 200) {
      final document = html_parser.parse(nameSearchResponse.body);
      
      // Find the form and submit with area selection
      final forms = document.querySelectorAll('form');
      for (final form in forms) {
        final action = form.attributes['action'];
        if (action == null) continue;
        
        print('\nSubmitting form for area selection...');
        
        // Build form data
        final formData = <String, String>{};
        
        final inputs = form.querySelectorAll('input, select, textarea');
        for (final input in inputs) {
          final name = input.attributes['name'];
          final value = input.attributes['value'];
          final type = input.attributes['type'];
          
          if (name != null) {
            if (type == 'hidden' && value != null) {
              formData[name] = value;
            } else if (name == 'layoutChildBody:childForm:area') {
              // Select 中部 (central area)
              formData[name] = '1020';
            } else if (value != null) {
              formData[name] = value;
            }
          }
        }
        
        // Add search button
        formData['layoutChildBody:childForm:doAreaSearch'] = '';
        
        print('Form data: ${formData.keys.join(', ')}');
        
        final body = formData.entries
            .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
            .join('&');
        
        final searchResponse = await client.post(
          Uri.parse(action.startsWith('http') ? action : baseUrl + action.replaceFirst('../user/', '')),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Content-Type': 'application/x-www-form-urlencoded',
            if (sessionId != null) 'Cookie': 'JSESSIONID=$sessionId',
          },
          body: body,
        );
        
        if (searchResponse.statusCode == 200) {
          print('Form submitted successfully');
          
          final resultDocument = html_parser.parse(searchResponse.body);
          
          // Look for facility options in the result
          final selects = resultDocument.querySelectorAll('select');
          print('\nFacility options found:');
          
          for (final select in selects) {
            final name = select.attributes['name'];
            if (name != null && name.contains('facility')) {
              final options = select.querySelectorAll('option');
              for (final option in options) {
                final value = option.attributes['value'];
                final text = option.text.trim();
                if (text.isNotEmpty && text != '選択してください' && !text.contains('選択')) {
                  print('  "$text" (value: $value)');
                }
              }
            }
          }
          
          // Also look for facility links or text
          final links = resultDocument.querySelectorAll('a');
          print('\nFacility links found:');
          
          for (final link in links) {
            final text = link.text.trim();
            final href = link.attributes['href'];
            
            if (text.isNotEmpty && (
              text.contains('体育館') || 
              text.contains('総合') ||
              text.contains('センター') ||
              text.contains('会館') ||
              text.contains('プール')
            ) && text.length < 100) {
              print('  "$text" -> $href');
            }
          }
        }
        
        break; // Only process first form
      }
    }
    
    client.close();
    
  } catch (e) {
    print('Error: $e');
  }
}