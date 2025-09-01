💕, [8/28/2025 12:05 PM]
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="ISO-8859-1" import="java.sql.*,java.io.*,java.util.*"%>
<!DOCTYPE html>
<html>
<head>
    <title>Student Grading System - Result</title>
    <meta charset="utf-8">
    <link rel="stylesheet" href="css/font-awesome.min.css">
    <link rel="stylesheet" href="css/materialize.css">
    <link rel="stylesheet" href="css/style.css">
    <style>
        table { border-collapse: collapse; width: 100%; background-color: white; color: black; }
        table, th, td { border: 1px solid #ccc; }
        th, td { padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; }
        .container-center { max-width: 1100px; margin: 10px auto; }
        .subtitle { margin-top: 18px; }
    </style>
</head>
<body>
<div class="container-center">
<%
    // read parameters
    String rollNo = request.getParameter("rolno");
    String semesterParam = request.getParameter("semester");

    if (rollNo == null  semesterParam == null  rollNo.trim().isEmpty() || semesterParam.trim().isEmpty()) {
%>
        <h3 style="color:red">Invalid request. Please go back and provide RollNo and Semester.</h3>
<%
        return;
    }

    rollNo = rollNo.trim();
    int semester = 0;
    try {
        semester = Integer.parseInt(semesterParam.trim());
    } catch (NumberFormatException ex) {
%>
        <h3 style="color:red">Invalid semester value.</h3>
<%
        return;
    }

    Connection con = null;
    PreparedStatement ps = null;
    ResultSet rs = null;

    try {
        Class.forName("com.mysql.jdbc.Driver");
        con = DriverManager.getConnection("jdbc:mysql://localhost/studentresult","root","");

        // -------------------------------------------------------------------
        // 1) Normal attempt records
        // -------------------------------------------------------------------
        String sqlNormal = "SELECT ca.*, co.C_name " +
                           "FROM calculate ca " +
                           "LEFT JOIN course co ON ca.C_code = co.C_code " +
                           "WHERE ca.RollNo = ? AND ca.Semester_id = ? AND ca.Exam_stage = 'Normal' " +
                           "ORDER BY ca.C_code";
        ps = con.prepareStatement(sqlNormal);
        ps.setString(1, rollNo);
        ps.setInt(2, semester);
        rs = ps.executeQuery();
%>
        <h3>RollNo: <%= rollNo %>, Semester: <%= semester %></h3>
        <div class="subtitle"><h4>Normal Exam Results (Semester <%= semester %>)</h4></div>
        <table>
            <tr>
                <th>No.</th>
                <th>Course Name</th>
                <th>Credit</th>
                <th>Total Mark</th>
                <th>Grade</th>
                <th>Grade Score</th>
                <th>Grade Point</th>
                <th>Exam Stage</th>
            </tr>
<%
        int idx = 1;
        boolean hasNormal = false;
        while (rs.next()) {
            hasNormal = true;
            String cName = rs.getString("C_name");
            if (cName == null) cName = rs.getString("C_code");
            int credit = rs.getInt("Credit");
            int mark = rs.getInt("Mark");
            String grade = rs.getString("Grade");
            double gradeScore = rs.getDouble("GradeScore");
            double gradePoint = gradeScore * credit;
%>
            <tr>
                <td><%= idx %></td>
                <td style="text-align:left; padding-left:10px;"><%= cName %></td>
                <td><%= credit %></td>
                <td><%= mark %></td>
                <td><%= grade %></td>
                <td><%= String.format("%.2f", gradeScore) %></td>
                <td><%= String.format("%.2f", gradePoint) %></td>
                <td><%= rs.getString("Exam_stage") %></td>
            </tr>
<%
            idx++;
        }
        if (!hasNormal) {
%>
            <tr><td colspan="8">No normal exam records for this semester.</td></tr>
<%
        }
        rs.close(); ps.close();

💕, [8/28/2025 12:05 PM]
// -------------------------------------------------------------------
        // 2) Reexam / Retake attempts
        // -------------------------------------------------------------------
        String sqlRe = "SELECT ca.*, co.C_name " +
                       "FROM calculate ca " +
                       "LEFT JOIN course co ON ca.C_code = co.C_code " +
                       "WHERE ca.RollNo = ? AND ca.Semester_id = ? AND ca.Exam_stage <> 'Normal' " +
                       "ORDER BY ca.C_code, ca.C_attempt";
        ps = con.prepareStatement(sqlRe);
        ps.setString(1, rollNo);
        ps.setInt(2, semester);
        rs = ps.executeQuery();
%>
        </table>
        <div class="subtitle"><h4>Reexam / Retake Results (Semester <%= semester %>)</h4></div>
        <table>
            <tr>
                <th>No.</th>
                <th>Course Name</th>
                <th>Attempt</th>
                <th>Credit</th>
                <th>Total Mark</th>
                <th>Grade</th>
                <th>Grade Score</th>
                <th>Grade Point</th>
                <th>Exam Stage</th>
            </tr>
<%
        idx = 1;
        boolean hasRe = false;
        while (rs.next()) {
            hasRe = true;
            String cName = rs.getString("C_name");
            if (cName == null) cName = rs.getString("C_code");
            int attempt = rs.getInt("C_attempt");
            int credit = rs.getInt("Credit");
            int mark = rs.getInt("Mark");
            String grade = rs.getString("Grade");
            double gradeScore = rs.getDouble("GradeScore");
            double gradePoint = gradeScore * credit;
%>
            <tr>
                <td><%= idx %></td>
                <td style="text-align:left; padding-left:10px;"><%= cName %></td>
                <td><%= attempt %></td>
                <td><%= credit %></td>
                <td><%= mark %></td>
                <td><%= grade %></td>
                <td><%= String.format("%.2f", gradeScore) %></td>
                <td><%= String.format("%.2f", gradePoint) %></td>
                <td><%= rs.getString("Exam_stage") %></td>
            </tr>
<%
            idx++;
        }
        if (!hasRe) {
%>
            <tr><td colspan="9">No reexam/retake records for this semester.</td></tr>
<%
        }
        rs.close(); ps.close();

        // -------------------------------------------------------------------
        // 3) Semester GPA (latest attempt per course in that semester)
        // -------------------------------------------------------------------
        String sqlLatestForSemester =
            "SELECT c2.*, co.C_name FROM calculate c2 " +
            "JOIN ( " +
            "  SELECT C_code, RollNo, Semester_id, MAX(C_attempt) AS max_attempt " +
            "  FROM calculate " +
            "  WHERE RollNo = ? AND Semester_id = ? " +
            "  GROUP BY C_code, RollNo, Semester_id " +
            ") t ON c2.C_code = t.C_code AND c2.RollNo = t.RollNo AND c2.Semester_id = t.Semester_id AND c2.C_attempt = t.max_attempt " +
            "LEFT JOIN course co ON c2.C_code = co.C_code " +
            "ORDER BY co.C_name";
        ps = con.prepareStatement(sqlLatestForSemester);
        ps.setString(1, rollNo);
        ps.setInt(2, semester);
        rs = ps.executeQuery();

💕, [8/28/2025 12:05 PM]
int semTotalCredits = 0;
        double semTotalGradePoints = 0.0;
        boolean hasAny = false;
%>
        </table>
        <div class="subtitle"><h4>Semester <%= semester %> — GPA Calculation</h4></div>
        <table>
            <tr>
                <th>No.</th>
                <th>Course Name</th>
                <th>Credit</th>
                <th>Total Mark</th>
                <th>Grade</th>
                <th>Grade Score</th>
                <th>Grade Point</th>
            </tr>
<%
        idx = 1;
        while (rs.next()) {
            hasAny = true;
            String cName = rs.getString("C_name");
            if (cName == null) cName = rs.getString("C_code");
            int credit = rs.getInt("Credit");
            int mark = rs.getInt("Mark");
            String grade = rs.getString("Grade");
            double gradeScore = rs.getDouble("GradeScore");
            double gradePoint = gradeScore * credit;
            semTotalCredits += credit;
            semTotalGradePoints += gradePoint;
%>
            <tr>
                <td><%= idx %></td>
                <td style="text-align:left; padding-left:10px;"><%= cName %></td>
                <td><%= credit %></td>
                <td><%= mark %></td>
                <td><%= grade %></td>
                <td><%= String.format("%.2f", gradeScore) %></td>
                <td><%= String.format("%.2f", gradePoint) %></td>
            </tr>
<%
            idx++;
        }
        if (!hasAny) {
%>
            <tr><td colspan="7">No records found for this semester.</td></tr>
<%
        }
        rs.close(); ps.close();

        double semesterGPA = 0.0;
        if (semTotalCredits > 0) semesterGPA = semTotalGradePoints / semTotalCredits;
%>
            <tr style="font-weight:bold; background:#f9f9f9;">
                <td colspan="2" style="text-align:right;">Total Credit Unit</td>
                <td><%= semTotalCredits %></td>
                <td colspan="3" style="text-align:right;">Total Grade Point</td>
                <td><%= String.format("%.2f", semTotalGradePoints) %></td>
            </tr>
            <tr style="font-weight:bold; background:#e6f7ff;">
                <td colspan="6" style="text-align:right;">Semester GPA</td>
                <td><%= String.format("%.2f", semesterGPA) %></td>
            </tr>
        </table>

<%
        // -------------------------------------------------------------------
        // 4) Overall GPA (latest attempt per course across ALL semesters)
        // -------------------------------------------------------------------
        String sqlLatestAllSemesters =
            "SELECT c2.*, co.Credit " +
            "FROM calculate c2 " +
            "JOIN ( " +
            "  SELECT C_code, RollNo, MAX(C_attempt) AS max_attempt " +
            "  FROM calculate " +
            "  WHERE RollNo = ? " +
            "  GROUP BY C_code, RollNo " +
            ") t ON c2.C_code = t.C_code AND c2.RollNo = t.RollNo AND c2.C_attempt = t.max_attempt " +
            "LEFT JOIN course co ON c2.C_code = co.C_code " +
            "WHERE c2.RollNo = ? " +
            "ORDER BY c2.Semester_id, c2.C_code";
        ps = con.prepareStatement(sqlLatestAllSemesters);
        ps.setString(1, rollNo);
        ps.setString(2, rollNo);
        rs = ps.executeQuery();

        int overallCredits = 0;
        double overallGradePoints = 0.0;
        while (rs.next()) {
            int credit = rs.getInt("Credit");
            double gradeScore = rs.getDouble("GradeScore");
            overallCredits += credit;
            overallGradePoints += gradeScore * credit;
        }
        rs.close(); ps.close();

💕, [8/28/2025 12:05 PM]
double overallGPA = 0.0;
        if (overallCredits > 0) overallGPA = overallGradePoints / overallCredits;
%>
        <div class="subtitle"><h4>Overall GPA (latest attempts)</h4></div>
        <table>
            <tr>
                <th style="text-align:right;">Overall Total Credit Unit</th>
                <td><%= overallCredits %></td>
                <th style="text-align:right;">Overall Total Grade Point</th>
                <td><%= String.format("%.2f", overallGradePoints) %></td>
                <th style="text-align:right;">Overall GPA</th>
                <td><%= String.format("%.2f", overallGPA) %></td>
            </tr>
        </table>
<%
    } catch(Exception e) {
        out.println("<h3 style='color:red'>Error: " + e.getMessage() + "</h3>");
        e.printStackTrace(new java.io.PrintWriter(out));
    } finally {
        try { if (rs != null) rs.close(); } catch(Exception ignore) {}
        try { if (ps != null) ps.close(); } catch(Exception ignore) {}
        try { if (con != null) con.close(); } catch(Exception ignore) {}
    }
%>
</div>
</body>
</html> 