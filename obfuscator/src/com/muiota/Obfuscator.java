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
        HashMap<String, String> swaps = new HashMap<>();
        String result = obfuscatePart(source, "function", "_f", swaps);
        result = obfuscatePart(result, "return", "_r", swaps);
        result = obfuscatePart(result, "if\\(", "_i", swaps);
        result = obfuscatePart(result, "else", "_e", swaps);
        result = obfuscatePart(result, "for\\(", "_l", swaps);
        result = obfuscatePart(result, "while\\(", "_w", swaps);
        result = obfuscatePart(result, "var ", "_v", swaps);
        result = obfuscatePart(result, " in ", "_t", swaps);
        result = obfuscatePart(result, "mouse", "_z", swaps);
        result = obfuscatePart(result, "color", "_c", swaps);
        result = obfuscatePart(result, "style", "_s", swaps);
        result = obfuscatePart(result, "Style", "_S", swaps);
        result = obfuscatePart(result, "touch", "_a", swaps);
        result = obfuscatePart(result, "name", "_n", swaps);
        result = obfuscatePart(result, "data", "_d", swaps);
        result = obfuscatePart(result, "replace", "_b", swaps);
        result = obfuscatePart(result, "move", "_x", swaps);

        result = result
                .replaceAll("\\\\", "\\\\\\\\")
                .replaceAll("\"", "\\\\\"");

        StringBuilder deObfuscate = new StringBuilder();

        for (Map.Entry<String, String> element : swaps.entrySet()) {
            deObfuscate.append(element.getKey() + ":\"" + element.getValue().replace("\\", "") + "\",");
        }


        // _a:"function",_b:"sdsd"

        result =
                "eval(function(){var s=\"" + result + "\",r={" + deObfuscate.toString() + "},k;for(k in r){s=s.replace(new RegExp(k,\"g\"),r[k])} return s}());";
        return result;
    }

    private String obfuscatePart(String source, String replaceable,
                                 String replacement, HashMap<String, String> swaps) throws Exception {
        if (swaps.containsKey(replacement)) {
            throw new Exception("Key " + replacement + " duplicated");
        }

        while (source.indexOf(replacement) >= 0) {
            throw new Exception("replacement " + replacement + " already exist in " + source);
        }
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
