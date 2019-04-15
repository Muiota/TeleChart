package com.muiota;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class Obfuscator {

    public Boolean process(String input, String output) throws IOException {
        try {
            String source = loadSource(input);
            System.out.println(source);
            String result = obfuscate(source);
            save(output, result);
            return true;
        } catch (Exception ex) {
            System.err.println(ex);
        }
        return false;
    }

    private String obfuscate(String source) throws Exception {

        String result = source
                .replaceAll("function\\(", "function \\(");

        HashMap<String, String> swaps = new HashMap<>();
        result = obfuscatePart(result, "function ", "~", swaps);
        result = obfuscatePart(result, "return", "_r", swaps);
        result = obfuscatePart(result, "if\\(", "`", swaps);
        result = obfuscatePart(result, "else", "_e", swaps);
        result = obfuscatePart(result, "for\\(", "_l", swaps);
        result = obfuscatePart(result, "while\\(", "_w", swaps);
        result = obfuscatePart(result, "var ", "@", swaps);
        result = obfuscatePart(result, " in ", "_t", swaps);
        result = obfuscatePart(result, "\\.onmouse", "_z", swaps);
        result = obfuscatePart(result, "color", "_c", swaps);
        result = obfuscatePart(result, "name", "_n", swaps);
        result = obfuscatePart(result, "data", "_d", swaps);
        result = obfuscatePart(result, "!==", "_j", swaps);
        result = obfuscatePart(result, "===", "_q", swaps);


       // result = obfuscatePart(result, "", "^", swaps);

        result = result
                .replaceAll("\\\\", "\\\\\\\\")
                .replaceAll("\"", "\\\\\"");

        StringBuilder deObfuscate = new StringBuilder();

        for (Map.Entry<String, String> element : swaps.entrySet()) {
            if (deObfuscate.length() > 0) {
                deObfuscate.append(",");
            }
            String value = element.getValue().replace("\\", "");
            String key = element.getKey();
            if ("`".equals(key) || "~".equals(key)|| "@".equals(key) || "'".equals(key)) {
                key = "\"" + key + "\"";
            }
            deObfuscate.append(key + ":\"" + value + "\"");
        }


        // _a:"function",_b:"sdsd"

        result =
                "eval(function(){var s=\"" + result + "\",r={" + deObfuscate.toString() + "},k;for(k in r){s=s.replace(new RegExp(k,\"g\"),r[k])} return s}());";
        return result;
    }

    private String obfuscatePart(String source, String replaceable,
                                 String replacement, HashMap<String, String> swaps) throws Exception {
        if (swaps.containsKey(replacement)) {
            throw new Exception("Key " + replacement + " duplicated for " + replaceable);
        }

        while (source.indexOf(replacement) >= 0) {
            throw new Exception("replacement " + replacement + " already exist in " + source);
        }

        System.out.println(replaceable + " " + source.split(replaceable).length);


        String result = source.replaceAll(replaceable, replacement);
        swaps.put(replacement, replaceable);
        return result;
    }

    private String loadSource(String fileName) throws IOException {
        Path path = Paths.get(fileName);
        byte[] fileBytes = Files.readAllBytes(path);
        return new String(fileBytes);
    }

    private void save(String fileName, String data) throws IOException {
        BufferedWriter writer = new BufferedWriter(new FileWriter(fileName));
        writer.write(data);

        writer.close();
    }

}
